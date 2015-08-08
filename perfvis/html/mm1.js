function mm1() {
  this.rho = function(lam, mu) {
    return lam/mu;
  }

  this.sojourn = function(lam,mu) {
    return 1 / (mu-lam);
  }

  this.length = function(lam, mu) {
    rho = lam/mu;
    return rho/(1-rho);
  }
  
  this.type = "M/M/1";
}