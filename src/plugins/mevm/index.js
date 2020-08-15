const getmacrosRg = /%macro.*?%endmacro/gs;
const getstline = /(?<=%macro).*/;
const getinstance = (name, flag = 'g') => new RegExp(`(?<!%macro\\s*)${name}\\s.*`, flag);
const ARG_SEP = ' ';
const PARAM_SEP = ',';
const END_LEN = '%endmacro'.length;

function compile(source, macrodefs) {
  source = `${macrodefs}\n\n${source}`;
  const macros = {};
  let newsource = '';
  let lasti = 0;
  const matches = [...source.matchAll(getmacrosRg)];

  matches.forEach(match => {
    const macroArgs = match[0].match(getstline);
    const [name] = macroArgs[0].trim().split(ARG_SEP).map(val => val.trim());
    const macrobody = match[0].substring(
      macroArgs.index + macroArgs[0].length,
      match[0].length - END_LEN,
    );

    const fn = (content, margs) => {
      let body = macrobody;
      margs.forEach((val, i) => {
        body = body.replaceAll(`%${i}`, val);
      });
      if (content) body = body.replace('%content', content);
      return body;
    }

    macros[name] = { fn, count: 0, hascontent: macrobody.includes('%content') };
    newsource += source.substring(lasti, match.index);
    lasti = match.index + match[0].length;
  });
  newsource += source.substring(lasti);

  const source2 = newsource;
  newsource = '';
  const usematches = Object.keys(macros)
    .filter(name => !macros[name].hascontent)
    .map(name => {
      const usereg = getinstance(name);
      return [...source2.matchAll(usereg)].map((val, i) => {
        val.macroname = name;
        val.instanceno = i;
        return val;
      });
    }).reduce((accum, val) => accum.concat(val), [])
    .sort((a, b) => a.index - b.index);

  const replaceInstance = (usematch, _newsource, oldsource, _lasti) => {
    const name = usematch.macroname;
    const params = usematch[0].substring(name.length)
      .trim()
      .split(PARAM_SEP)
      .map(val => val.trim());
    const text = macros[name].fn(usematch.content, params);
    const comment = `/* (${usematch.instanceno}) ${name} ${params.join(', ')}    */\n`;
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
    const text = macros[name].fn(usematch.content, params);
    // const comment = `/* (${usematch.instanceno}) ${name} ${params.join(', ')}    */\n`;
    const comment = '';
    _newsource += oldsource.substring(_lasti, usematch.index) + comment + text;
    _lasti = usematch.index + usematch[0].length;
    return [_newsource, _lasti];
  }

  while (macrosWContent.length > 0) {
    lasti = 0;
    const source3 = newsource;
    newsource = '';
    const contentmatch = source3.match(getinstance(macrosWContent[0], ''));

    if (!contentmatch) {
      macrosWContent.shift();
      newsource = source3;
    } else {
      contentmatch.macroname = macrosWContent[0];
      contentmatch.instanceno = 0
      const closingpi = getClosingParensPos(source3, contentmatch.index + contentmatch[0].length);
      // const text = source3.substring(contentmatch.index, closingpi + 1);
      contentmatch.content = source3.substring(
        contentmatch.index + contentmatch[0].length,
        closingpi,
      );
      const [s] = replaceInstance2(contentmatch, newsource, source3, lasti);
      newsource = s;
      newsource += source3.substring(closingpi + 1);
    }
  }

  return newsource;
}

export default {
  compile,
  key: 'macros',
  url: 'https://raw.githubusercontent.com/loredanacirstea/mevm/macros/src/plugins/mevm/macros/macros.sol',
  filename: 'mevm_macros.sol',
}
