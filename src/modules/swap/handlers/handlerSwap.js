import { OneInch, ZEROX, ParaSwap, Changelly } from './providers';
import { isAddress } from 'web3-utils';
import BigNumber from 'bignumber.js';
import Configs from './configs.js';
import hasValidDecimals from '@/core/helpers/hasValidDecimals.js';
import { isObject } from 'lodash';
const mergeIfNotExists = (baseList, newList) => {
  newList.forEach(t => {
    for (const bl of baseList) {
      if (bl.name.toLowerCase() === t.name.toLowerCase()) return;
      if (bl.contract.toLowerCase() === t.contract.toLowerCase()) return;
    }
    baseList.push(t);
  });
  return baseList;
};
class Swap {
  constructor(web3, chain) {
    this.providers = [
      new OneInch(web3, chain),
      new ZEROX(web3, chain),
      new ParaSwap(web3, chain),
      new Changelly(web3, chain)
    ];
    this.chain = chain;
  }
  getAllTokens() {
    let allTokens = [];
    return this.providers[0].getSupportedTokens().then(baseList => {
      allTokens = allTokens.concat(baseList);
      return Promise.all(
        this.providers.map((p, idx) => {
          if (idx < 2) return Promise.resolve();
          if (!p.isSupportedNetwork(this.chain)) return Promise.resolve();
          return p.getSupportedTokens().then(tokens => {
            if (tokens && tokens.length > 0) {
              allTokens = mergeIfNotExists(allTokens, tokens);
            }
          });
        })
      ).then(() => {
        const sorted = allTokens
          .filter(t => isObject(t))
          .sort((a, b) => {
            if (a.name > b.name) return 1;
            return -1;
          })
          // remove once merging to native PR
          .filter(item => item.isEth);
        return {
          fromTokens: sorted.filter(t => isAddress(t.contract)),
          toTokens: sorted
        };
      });
    });
  }
  getAllQuotes({ fromT, toT, fromAmount }) {
    let allQuotes = [];
    return Promise.all(
      this.providers.map(p => {
        if (!p.isSupportedNetwork(this.chain)) return Promise.resolve();
        return p.getQuote({ fromT, toT, fromAmount }).then(quotes => {
          allQuotes = allQuotes.concat(quotes);
        });
      })
    ).then(() => {
      allQuotes.sort((q1, q2) => {
        if (new BigNumber(q1.amount).gt(new BigNumber(q2.amount))) return -1;
        return 1;
      });
      return allQuotes.map(q => {
        if (Configs.exchangeInfo[q.exchange]) {
          q.exchangeInfo = Configs.exchangeInfo[q.exchange];
        } else {
          q.exchangeInfo = Configs.exchangeInfo.default;
          q.exchangeInfo.name = q.exchange;
        }
        return q;
      });
    });
  }
  getQuotesForSet(arr) {
    const quotes = [];
    const provider = this.providers[3];
    for (let i = 0; i < arr.length; i++) {
      quotes.push(provider.getQuote(arr[i]));
    }
    return Promise.all(quotes);
  }
  getTrade(tradeInfo) {
    for (const p of this.providers) {
      if (p.provider === tradeInfo.provider) return p.getTrade(tradeInfo);
    }
  }
  isValidToAddress(addressInfo) {
    for (const p of this.providers) {
      if (p.provider === addressInfo.provider)
        return p.isValidToAddress(addressInfo);
    }
  }
  executeTrade(tradeInfo, confirmInfo) {
    for (const p of this.providers) {
      if (p.provider === tradeInfo.provider)
        return p.executeTrade(tradeInfo, confirmInfo);
    }
  }
  getMinMaxAmount(tradeInfo) {
    for (const p of this.providers) {
      if (p.provider === tradeInfo.provider)
        return p.getMinMaxAmount(tradeInfo);
    }
  }
  getStatus(statusObj) {
    for (const p of this.providers) {
      if (p.provider === statusObj.provider) return p.getStatus(statusObj);
    }
  }
}

Swap.helpers = {
  hasValidDecimals
};

export default Swap;
