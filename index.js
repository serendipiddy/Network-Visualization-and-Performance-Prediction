var express = require('express');
var app = express();
app.use(express.bodyParser());
var replace = require("replace");


var portNumber = 3000;
var samples = ['scale_test_1', 'scale_test_2', 'scale_test_5', 'scale_test_10', 'scale_test_20', 'scale_test_50', 'scale_test_100', 'scale_test_200', 'scale_test_500', 'scale_test_1000', 'scale_test_1500', 'scale_test_2000'];
var idx = 0;
var run_count = 0;

app.use(express.static('perfvis/html'));

/* RESTful calls */
app.post('/change_sample',function(req,res) {
  var new_idx = (idx + 1) % samples.length
  set_sample(new_idx);
  idx = new_idx;
  if (new_idx == 0) run_count++;
  
  res.statusCode = 200;
  res.send('changed');
});

/* bind and listen for connections */
var server = app.listen(portNumber, function() {
  console.log('(server running) ====== '+new Date().toGMTString()+' ======');
  console.log('(server running) Current sample: '+samples[idx]);
  set_sample(0);
});


function set_sample(new_idx) {
  // replace({
      // regex: "sample_idx = "+curr_idx,
      // replacement: "sample_idx = "+new_idx,
      // paths: [__dirname+'/perfvis/html/tests.js'],
      // recursive: true,
      // silent: true,
  // });
  
  var fs = require('fs');
  var filename = __dirname+'/perfvis/html/index.html';
  var buf = fs.readFileSync(filename, {encoding: 'utf-8'});
  
  fs.readFile(filename, 'utf-8', function(err, data){
    if (err) throw err;

    var regex = new RegExp('scale_test_\\d+')
    console.log('(change_sample)  From: '+data.match(regex)+', to: '+samples[new_idx]+' runs: '+run_count);
    // var newString = 'id=\'sample-file\' src="./+'+samples[new_idx]+'.js"'
    var newValue = data.replace(regex, samples[new_idx]);

    fs.writeFile(filename, newValue, 'utf-8', function (err) {
      if (err) throw err;
      // console.log('filelistAsync complete');
    });
  });
}

