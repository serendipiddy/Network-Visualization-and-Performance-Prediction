var mm1_basic = {
  lam:0,
  mu:0,
  rho:0,
  set_input: function(input) {
    this.lam = input.arrival_rate;
    this.mu  = input.service_rate;
    this.rho = this.lam/this.mu;
  },
  load: function() {
    return this.rho;
  },
  sojourn: function() {
    return 1 / (this.mu-this.lam);
  },
  length: function() {
    return this.rho/(1-this.rho);
  },
}

config.get_model['mm1_basic'] = mm1_basic;
