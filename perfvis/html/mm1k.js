var mm1k_basic = {
  lam:0,
  mu:0,
  rho:0,
  k:0,
  set_input: function(input) {
    this.lam = input.arrival_rate;
    this.mu  = input.service_rate;
    this.rho = this.lam/this.mu;
    if (input.queue_capacity < 0) {
      console.log("Error: queue capacity cannot be less than 0");
      return;
    }
    this.k   = input.queue_capacity;
  },
  load: function() {
    return this.rho;
  },
  sojourn: function() {
    return this.length()/this.lam_eff();
  },
  length: function() {
    var a = this.rho * (1 - (this.k+1)*Math.pow(this.rho,this.k) + this.k*Math.pow(this.rho, this.k+1));
    var b = (1 - this.rho)*(1 - Math.pow(this.rho,this.k+1));
    return a/b;
  },
  pi0: function() {
    if (this.lam == this.mu) {
      return 1 / (this.k + 1);
    }
    return (1-this.rho) / (1-Math.pow(this.rho,this.k+1))
  },
  pij: function(j) {
    if (this.lam == this.mu) {
      return 1 / (this.k + 1);
    }
    return Math.pow(this.rho,j) * this.pi0();
  },
  lam_eff: function() {
    return this.lam * (1 - this.pij(this.k));
  }
}

config.get_model['mm1k_basic'] = mm1k_basic;
