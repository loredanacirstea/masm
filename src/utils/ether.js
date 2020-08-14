import { ethers } from 'ethers';

export function getTransaction(funcAbi, args) {
  const {defaultAbiCoder} = ethers.utils;

  const interf = new ethers.utils.Interface([funcAbi]);
  const sig = interf.functions[funcAbi.name].sighash;
  const encodedArgs = args.length > 0
    ? defaultAbiCoder.encode(
      funcAbi.inputs.map(inp => inp.type),
      args,
    ) : '';

  return `${sig}${encodedArgs.slice(2)}`;
}
