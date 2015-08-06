mm1 = {
  mm1_rho = function(lam, mu) {
    return lam/mu;
  }

  mm1_soj = function(lam,mu) {
    return 1 / (mu-lam);
  }

  mm1_L = function(lam, mu) {
    rho = lam/mu;
    return rho/(1-rho);
  }
}