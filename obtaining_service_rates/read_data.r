setwd('c:/tmp/sniffs/')
# http://stackoverflow.com/a/18660042
# install.packages("Hmisc", dependencies=T)
library("Hmisc")

y = seq(200000)
sizes = c(10,60,200,600,1000,1400,1460)
sizs = c('s10','s60','s200','s600','s1000','s1400','s1460')
iters = c("00", "01", "02" ,"03", "04", "05", "06", "07", "08", "09")

# https://stat.ethz.ch/pipermail/r-help/2010-November/259237.html
results = list()

# pull and store the means of the data
for (s in sizes) {
  # http://stackoverflow.com/questions/12614953/how-to-create-a-numeric-vector-of-zero-length-in-r
  means = numeric()
  for (i in iters) {
    file = paste("out_",i,"-eth1_",s,".dump",sep='')
    data = read.table(file,head=T)
    print(paste('Size ',s,', iteration ',i,': ',mean(data$delta),sep=''))
    means = c(means,mean(data$delta))
  }
  results = c(results, list(means))
}
names(results) = sizs

means = numeric()
sds = numeric()
vars = numeric()
# calculate measures of central tendancy
for(z in sizs) {
  m = mean(results[[z]])
  v = var(results[[z]])
  s = sd(results[[z]])
  out = paste(m,v,s)
  print(out)
  means = c(means,m)
  sds = c(sds,s)
  vars = c(vars,v)
}
names(means) = sizs
d = data.frame(
  x = sizes,
  y = means,
  sd = sds
)

# Draw a graph, because.
plot(d$x, d$y, type='n')
with (
  data = d,
  expr = errbar(x, y, y+sd, y-sd, add=F, pch=1, cap=.015,xlab='Payload size (B)',ylab='Service Time (ns)')
)
title(main='Service time of OpenVSwitch in VM')

# Cleaning the data
# find the values greater than upper quartile
dss = numeric()

for (i in seq(200000)) { 
  if (data$delta[i]>x){ 
    dss=c(dss,data$delta[i]); 
    count=count+1 
  }
}
# look dss
quantiles(dss)
#decide a point to cut off
x = 61790.25
d = data$delta

for (i in seq(200000)) { 
  if (data$delta[i]>x){ 
     d[i] = NA
  }
}
# Finding lower bound on data
plot(plot(y,d,xlab='samples',ylab='service time (ns)',main="Service times, 600B, 5th iteration",pch='.')
abline(h=15500)

# remove it
for (i in seq(200000)) { 
  if (data$delta[i]>15500){ 
    d[i] = NA
  }
}
     
# plot, and then mean(d,na.rm=T)
plot(plot(y,d,xlab='samples',ylab='service time (ns)',main="Service times, 600B, 5th iteration",pch='.')
hist(d,breaks=100,xlab='Service time (ns)',main="Service times, 600B, 5th iteration"))