let z = require('zero-fill'),
  n = require('numbro'),
  ta_srsi = require('../../../lib/ta_stochrsi'),
  Phenotypes = require('../../../lib/phenotype')
module.exports = {
  name: 'ta_stoch_rsi',
  description: 'Stochastic RSI',

  getOptions: function() {
    this.option('period', 'period length, same as --period_length', String, '3m')
    this.option('period_length', 'period length, same as --period', String, '3m')
    this.option('min_periods', 'min. number of history periods', Number, 200)
    this.option('srsi_periods', 'number of Stochastic RSI periods',Number, 14)
    this.option('srsi_k', '%D line', Number, 3)
    this.option('srsi_d', '%D line', Number, 3)
    this.option('srsi_k_sell', 'K must be above this before selling', Number, 85)
    this.option('srsi_k_buy', 'K must be below this before buying', Number, 15)
    this.option('srsi_dType','D type mode : SMA,EMA,WMA,DEMA,TEMA,TRIMA,KAMA,MAMA,T3', String, 'EMA')
  },

  calculate: s => {
    if (s.in_preroll) return
  },

  onPeriod: (s, cb) => {
    //make sure we have all values
    if (s.in_preroll) return cb()

    ta_srsi(s, 'srsi', s.options.srsi_periods, s.options.srsi_k, s.options.srsi_d, s.options.srsi_dType)
    .then(inres => {
        if (!inres) return cb()
        s.period.srsi_D = inres.outFastD[inres.outFastD.length - 1]
        s.period.srsi_K = inres.outFastK[inres.outFastK.length - 1]
		var divergent = s.period.srsi_K - s.period.srsi_D
        var last_divergent = inres.outFastK[inres.outFastK.length - 2] - inres.outFastD[inres.outFastD.length - 2]
        var _switch = 0
        var nextdivergent = ((divergent + last_divergent)/2) + (divergent - last_divergent)
        if (last_divergent <= 0 && divergent > 0) _switch = 1 // price rising
        if (last_divergent >= 0 && divergent < 0) _switch = -1 // price falling

        s.period.divergent = divergent
        s.period._switch = _switch

        // K is fast moving

        s.signal = null
        if (_switch != 0) {
          if (s.period.srsi_D > s.options.srsi_k_sell
              && s.period.srsi_K <= s.period.srsi_D) {
            s.signal = 'sell'
          } else if (s.period.srsi_D < s.options.srsi_k_buy
              && s.period.srsi_K >= s.period.srsi_D) {
            s.signal = 'buy'
          }
        }
        cb()
    }).catch(function(){
      cb()})
  },

  onReport: function (s) {
    var cols = []
    if (s.period.srsi_D) {
      var color = 'grey'
      if (s.period.srsi_D < s.options.srsi_k_buy) {
        color = 'green'
      } else if (s.period.srsi_D > s.options.srsi_k_sell) {
        color = 'red'
      }
      cols.push(z(8, n(s.period.close).format('+00.0000'), ' ')[color])
      cols.push(z(8, n(s.period.srsi_D).format('0.0000').substring(0,7), ' ').cyan)
      cols.push(z(8, n(s.period.srsi_K).format('0.0000').substring(0,7), ' ').cyan)
      cols.push(z(5, n(s.period.divergent).format('0').substring(0,7), ' ').cyan)
      cols.push(z(2, n(s.period._switch).format('0').substring(0,2), ' ').cyan)
    } else {
      cols.push('         ')
    }
    return cols
  },

  phenotypes:
        {
          // -- common
          period_length: Phenotypes.ListOption(['1m', '2m', '3m', '4m', '5m', '10m','15m']),//, '10m','15m','30m','45m','60m'
          min_periods: Phenotypes.Range(52, 150),
          markdown_buy_pct: Phenotypes.RangeFactor(-1.0, 1.0, 0.1),
          markup_sell_pct: Phenotypes.RangeFactor(-1.0, 1.0, 0.1),
          order_type: Phenotypes.ListOption(['maker', 'taker']),
          sell_stop_pct: Phenotypes.RangeFactor(0.0, 50.0,0.1),
          buy_stop_pct: Phenotypes.RangeFactor(0.0, 50.0,0.1),
          profit_stop_enable_pct: Phenotypes.RangeFactor(0.0, 5.0, 0.1),
          profit_stop_pct: Phenotypes.RangeFactor(0.0, 50.0, 0.1),

          // -- strategy
          srsi_periods: Phenotypes.Range(5, 30),
          srsi_k: Phenotypes.Range(1, 30),
          srsi_d: Phenotypes.Range(1, 30),
          srsi_k_sell: Phenotypes.RangeFactor(0.0, 100.0, 1.0),
          srsi_k_buy: Phenotypes.RangeFactor(0.0, 100.0, 1.0),
          srsi_dType:  Phenotypes.ListOption(['SMA','EMA','WMA','DEMA','TEMA','TRIMA','KAMA','MAMA','T3']),

          bollinger_size: Phenotypes.RangeFactor(10, 25, 1),
          bollinger_updev: Phenotypes.RangeFactor(1, 3.0, 0.1),
          bollinger_dndev: Phenotypes.RangeFactor(1, 3.0, 0.1),
          bollinger_dType: Phenotypes.ListOption(['SMA','EMA','WMA','DEMA','TEMA','TRIMA','KAMA','MAMA','T3']),
          bollinger_upper_bound_pct: Phenotypes.RangeFactor(0.0, 100.0, 1.0),
          bollinger_lower_bound_pct: Phenotypes.RangeFactor(0.0, 100.0, 1.0)
        }
}
