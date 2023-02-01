let z = require('zero-fill'),
  n = require('numbro'),
  ta_stoch = require('../../../lib/ta_stoch'),
  Phenotypes = require('../../../lib/phenotype')

module.exports = {
  name: 'ta_stoch',
  description: 'Stochastic strategy with configurable moving average type. Equivalent to ti_stoch with ma_type = SMA',

  getOptions: function() {
    this.option('period', 'period length, same as --period_length', String, '3m')
    this.option('period_length', 'period length, same as --period', String, '3m')
    this.option('min_periods', 'min. number of history periods', Number, 200)
    this.option('stoch_periods', 'Time period for building the Fast-K line', Number, 14)
    this.option('stoch_k', 'Smoothing for making the Slow-K line. Usually set to 3', Number, 3)
    this.option('stoch_k_ma_type', 'Type of Moving Average for Slow-K : SMA,EMA,WMA,DEMA,TEMA,TRIMA,KAMA,MAMA,T3', String, 'EMA'),
    this.option('stoch_d', 'Smoothing for making the Slow-D line', Number, 3)
    this.option('stoch_d_ma_type', 'Type of Moving Average for Slow-D : SMA,EMA,WMA,DEMA,TEMA,TRIMA,KAMA,MAMA,T3', String, 'EMA'),
    this.option('stoch_k_sell', 'K must be above this before selling', Number, 85)
    this.option('stoch_k_buy', 'K must be below this before buying', Number, 15)
  },

  calculate: function(s) {
    if (s.in_preroll) return
  },

  onPeriod: function(s, cb) {
    //make sure we have all values
    if (s.in_preroll) return cb()
    ta_stoch(s, 'stoch', s.options.stoch_periods, s.options.stoch_k, s.options.stoch_k_ma_type, s.options.stoch_d, s.options.stoch_d_ma_type)
      .then(function(inres) {
        if (!inres) return cb()
        s.period.stoch_D = inres.d[inres.d.length - 1]
        s.period.stoch_K = inres.k[inres.k.length - 1]
        var divergent = s.period.stoch_K - s.period.stoch_D
        var last_divergent = inres.k[inres.k.length - 2] - inres.d[inres.d.length - 2]
        var _switch = 0
        var nextdivergent = ((divergent + last_divergent) / 2) + (divergent - last_divergent)
        if (last_divergent <= 0 && divergent > 0) { // last_K <= last_D && K > D
          _switch = 1 // price rising
        }
        if (last_divergent >= 0 && divergent < 0) { // last_K >= last_D && K < D
          _switch = -1 // price falling
        }

        s.period.divergent = divergent
        s.period._switch = _switch

        s.signal = null
        if (_switch != 0) {
          if (s.period.stoch_D > s.options.stoch_k_sell
            && s.period.stoch_K <= s.period.stoch_D)
          {
            s.signal = 'sell'
          } else if (s.period.stoch_D < s.options.stoch_k_buy
            && s.period.stoch_K >= s.period.stoch_D)
          {
            s.signal = 'buy'
          }
        }
        cb()
    }).catch(function() {
      cb()
    })
  },

  onReport: function(s) {
    var cols = []
    var color = 'grey'
    if (s.period.stoch_D < s.options.stoch_k_buy) {
      color = 'green'
    }
    if (s.period.stoch_D > s.options.stoch_k_sell) {
      color = 'red'
    }
    cols.push(z(8, n(s.period.close).format('+00.0000'), ' ')[color])
    cols.push(z(8, n(s.period.stoch_D).format('0.0000').substring(0, 7), ' ').cyan)
    cols.push(z(8, n(s.period.stoch_K).format('0.0000').substring(0, 7), ' ').cyan)
    cols.push(z(5, n(s.period.divergent).format('0').substring(0, 7), ' ').cyan)
    cols.push(z(2, n(s.period._switch).format('0').substring(0, 2), ' ').cyan)
    return cols
  },

  phenotypes: {
    // -- common
    period_length: Phenotypes.ListOption(['1m', '2m', '3m', '4m', '5m', '10m', '15m']),
    min_periods: Phenotypes.Range(52, 150),
    markdown_buy_pct: Phenotypes.RangeFactor(-1.0, 1.0, 0.1),
    markup_sell_pct: Phenotypes.RangeFactor(-1.0, 1.0, 0.1),
    order_type: Phenotypes.ListOption(['maker', 'taker']),
    sell_stop_pct: Phenotypes.RangeFactor(0.0, 50.0, 0.1),
    buy_stop_pct: Phenotypes.RangeFactor(0.0, 50.0, 0.1),
    profit_stop_enable_pct: Phenotypes.RangeFactor(0.0, 5.0, 0.1),
    profit_stop_pct: Phenotypes.RangeFactor(0.0, 50.0, 0.1),

    // -- strategy
    stoch_periods: Phenotypes.Range(5, 30),
    stoch_k: Phenotypes.Range(1, 10),
    stoch_k_ma_type: Phenotypes.ListOption(['SMA', 'EMA', 'WMA', 'DEMA', 'TEMA', 'TRIMA', 'KAMA', 'MAMA', 'T3']),
    stoch_d: Phenotypes.Range(1, 10),
    stoch_k_sell: Phenotypes.RangeFactor(0.0, 100.0, 1.0),
    stoch_k_buy: Phenotypes.RangeFactor(0.0, 100.0, 1.0),
    stoch_d_ma_type: Phenotypes.ListOption(['SMA', 'EMA', 'WMA', 'DEMA', 'TEMA', 'TRIMA', 'KAMA', 'MAMA', 'T3']),
  }
}
