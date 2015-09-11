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
    /* Average utilisation of a node */
    return this.rho;
  },
  sojourn: function() {
    /* Calculates the expected sojourn time of a job in this mm1 queue */
    return 1 / (this.mu-this.lam);
  },
  length: function() {
    /* Calculates the average number of jobs in the system (in queue + in service) for an mm1 queue */
    return this.rho/(1-this.rho);
  },
}

config.get_model['mm1_basic'] = mm1_basic;
