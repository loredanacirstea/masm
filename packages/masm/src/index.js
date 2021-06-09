const getmacrosRg = /%macro\s.*?%endmacro/gs;
const getmacroListsRg = /%macrolist\s.*?%endmacrolist/gs;
const getstline = /%macro .*/;
const getstlineList = /%macrolist .*/;

const getinstance = (name, flag = 'g') => new RegExp(`${name} .*`, flag);
// const getinstance_noparams = (name, flag = 'g') => new RegExp(`(?<!%macro\\s*)${name}(?:\\n)`, flag);
// const getinstance2 = (name, flag = 'g') => new RegExp(`(\\w* *)${name}\\s.*`, flag)
const getinstance2 = (name, flag = 'g') => new RegExp(`${name}\\s.*`, flag);


const DEF_ARG_SEP = '"';
const ARG_SEP = ' ';
const PARAM_SEP = ',';
const MACRO_LEN = '%macro '.length;
const MACROLIST_LEN = '%macrolist '.length;
const END_LEN = '%endmacro'.length;
const END_LEN_LIST = '%endmacrolist'.length;
// let\s*([\w\d]*)\s*:=\s*(\w*)
const paramTemplateRegex = paramArray => {
  const regextxt = paramArray.map(param => {
    if (param.arg) return '([\\w\\d]*)';
    return param.text;
  }).join('\\s*')
  return new RegExp(regextxt);
}

const getInstanceMatches = (source, name) => {
  const inst = getinstance(name);
  return [...source.matchAll(inst)]
}

if (typeof window !== 'undefined') {
  window.vars = {test: 1};
}

function extractJsTemplateString(source, starti) {
  let start = source.substring(starti).indexOf('`');
  if (start < 0) return null;
  start += starti;
  let end = source.substring(start + 1).indexOf('`');
  if (end < 0) throw new Error(`Invalid JS template string in macro: ${source}`);
  end += start + 1;
  const fragment = source.substring(start, end + 1);
  return { fragment, start, end };
}

function macroContentExtract(source) {
  const fragments = [];
  let lasti = 0;
  let fragment = extractJsTemplateString(source, lasti)
  while (fragment) {
    if (fragment.start > lasti) {
      const txt = source.substring(lasti, fragment.start);
      if (txt.trim().length > 0) fragments.push({text: txt});
    }
    fragments.push({text: fragment.fragment, jsString: true});
    lasti = fragment.end + 1;
    fragment = extractJsTemplateString(source, lasti);
  }
  if (fragments.length === 0) fragments.push({text: source});
  else if (lasti < source.length) {
    const txt = source.substring(lasti);
    if (txt.trim().length > 0) fragments.push({text: txt});
  }
  return fragments;
}

// template: let %0 := %1 or for {%content0} %0 {%content1}
// expression: let a := 0x60
function extractParams(template, expression, name, list = false) {
  if (list) {
    return expression.replace(name, '').split(template).map(val => val.trim());
  }
  const params = template.split(ARG_SEP)
    .map(val => {
      const text = val.trim();
      return { text, arg: text.includes('%') };
    })
  const regex = paramTemplateRegex(params);
  const match = expression.match(regex);
  const noOfArgs = params.filter(value => value.arg).length;
  // regex has a group for each argument, starting with index 1
  return [...new Array(noOfArgs).keys()].map(i => match[i + 1]);
}

function getMacros(source) {
  const macros = {};
  let newsource = '';
  let lasti = 0;
  let matches = [...source.matchAll(getmacrosRg)];
  matches = matches.concat([...source.matchAll(getmacroListsRg)].map(val => {
    val.list = true;
    return val;
  }));
  matches = matches.sort((a, b) => a.index - b.index);
  matches.forEach(match => {
    let macroArgs, _macroArgs;
    if (match.list) {
      macroArgs = match[0].match(getstlineList);
      _macroArgs = macroArgs[0].trim().slice(MACROLIST_LEN);
    } else {
      macroArgs = match[0].match(getstline);
      _macroArgs = macroArgs[0].trim().slice(MACRO_LEN);
    }
    const [name, template] = _macroArgs.trim().split(DEF_ARG_SEP).map(val => val.trim());

    const macrobody = match[0].substring(
      macroArgs.index + macroArgs[0].length,
      match[0].length - (match.list ? END_LEN_LIST : END_LEN),
    );
    let fn = (match, margs) => {
      const { content, instanceno } = match;
      let body = macrobody;
      margs.forEach((val, i) => {
        body = body.replace(new RegExp(`%${i}`, 'g'), val);
      });
      body = body.replace(/%incount/g, margs.length);
      body = body.replace(/%instance/g, instanceno);

      // Separate js template string content from normal content
      const bodyfragments = macroContentExtract(body);
      // console.log('bodyfragments', bodyfragments);

      body = bodyfragments.map(fragment => {
        let txt = fragment.text;

        if (fragment.jsString) {
          if (content) {
            txt = txt.replace('%content', `\`${content}\``);
          }
          function evaluate(text) {
            // eslint-disable-next-line no-eval
            return eval(text);
          }
          const res = evaluate(txt);
          return res;
        }
        return content ? txt.replace('%content', content) : txt;
      }).join('');
      return body;
    }
    if (match.list) {
      fn = (match, margs) => {
        const { content } = match;
        let body = '';
        margs.forEach((val) => {
          body += macrobody.replace(/%x/g, val);
        });
        if (content) body = body.replace('%content', content);
        return body;
      }
    }

    macros[name] = {
      fn,
      count: 0,
      hascontent: macrobody.includes('%content'),
      template,
      list: match.list,
    };
    newsource += source.substring(lasti, match.index);
    lasti = match.index + match[0].length;
  });
  newsource += source.substring(lasti);
  return { macros, newsource };
}

function compile(source, macrodefs) {
  source = `${macrodefs}\n\n${source}`;
  let macros = {};
  let newsource = '';
  let lasti = 0;
  const instanceNos = {};

  ({ macros, newsource } = getMacros(source));

  const source2 = newsource;
  newsource = '';
  const usematches = Object.keys(macros)
    .filter(name => !macros[name].hascontent)
    .map(name => {
      return getInstanceMatches(source2, name).map((val, i) => {
        val.macroname = name;
        val.instanceno = i;
        instanceNos[val.macroname] = i;
        return val;
      });
    }).reduce((accum, val) => accum.concat(val), [])
    .sort((a, b) => a.index - b.index);

  const replaceInstance = (usematch, _newsource, oldsource, _lasti) => {
    const name = usematch.macroname;
    let params = usematch[0].substring(name.length)
      .trim()
      .split(PARAM_SEP)
      .map(val => val.trim());

    // Process params after template definition if exists
    if (macros[name].template) {
      params = extractParams(macros[name].template, usematch[0], name, macros[name].list)
    }
    const text = macros[name].fn(usematch, params).trim();
    const usercommenti = usematch[0].indexOf('//');
    const usercomment = usercommenti > -1 ? usematch[0].substring(usercommenti) : '';
    const comment = `/* (${usematch.instanceno}) ${name} ${params.join(', ')}   ${usercomment}   */\n`;
    _newsource += oldsource.substring(_lasti, usematch.index) + comment + text;
    _lasti = usematch.index + usematch[0].length;
    return [_newsource, _lasti];
  }

  lasti = 0;
  usematches.forEach(usematch => {
    const [s, i] = replaceInstance(usematch, newsource, source2, lasti);
    newsource = s;
    lasti = i;
  });
  newsource += source2.substring(lasti);

  lasti = 0;
  const macrosWContent = Object.keys(macros).filter(name => macros[name].hascontent);

  // text starts after first parens
  const getClosingParensPos = (text, starti) => {
    let openp = 1;
    let closedp = 0;
    const ind = [...new Array(text.length - starti).keys()].find(i => {
      if (text[starti + i] === '{') openp += 1;
      if (text[starti + i] === '}') closedp += 1;
      if (openp === closedp) return true;
      return false;
    });
    return starti + ind;
  }

  const replaceInstance2 = (usematch, _newsource, oldsource, _lasti) => {
    const name = usematch.macroname;
    let pi = usematch[0].lastIndexOf('{');
    pi = pi === -1 ? usematch[0].length : pi;
    const params = usematch[0].substring(name.length, pi)
      .trim()
      .split(PARAM_SEP)
      .map(val => val.trim());
    const text = macros[name].fn(usematch, params).trim();
    // const comment = `/* (${usematch.instanceno}) ${name} ${params.join(', ')}    */\n`;
    const comment = '\n';
    _newsource += oldsource.substring(_lasti, usematch.index) + comment + text;
    _lasti = usematch.index + usematch[0].length;
    return [_newsource, _lasti];
  }

  while (macrosWContent.length > 0) {
    const source3 = newsource;
    newsource = '';
    const contentmatch = source3.match(getinstance2(macrosWContent[0], ''));
    if (!contentmatch) {
      macrosWContent.shift();
      newsource = source3;
    }
    else {
      const _contentmatch = contentmatch[0].trim();
      contentmatch.macroname = macrosWContent[0];
      let lastinstance = instanceNos[contentmatch.macroname]
      lastinstance = (lastinstance || lastinstance === 0) ? (lastinstance + 1) : 0;
      instanceNos[contentmatch.macroname] = lastinstance;
      contentmatch.instanceno = lastinstance;

      const closingpi = getClosingParensPos(source3, contentmatch.index + _contentmatch.length);

      contentmatch.content = source3.substring(
        contentmatch.index + _contentmatch.length,
        closingpi,
      );

      const [s] = replaceInstance2(contentmatch, newsource, source3, 0);
      newsource = s;
      newsource += source3.substring(closingpi + 1);
    }
  }

  newsource = newsource.trim();
  return newsource;
}

module.exports = {
  compile,
  key: 'macros',
  url: 'https://raw.githubusercontent.com/loredanacirstea/masm/master/packages/masm/src/macros/macros.masm',
  filename: 'masm_macros.masm',
}
