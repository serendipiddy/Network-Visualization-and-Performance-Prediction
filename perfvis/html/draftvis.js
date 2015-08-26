
/* Layout functions */
var menu_addDp = function(dpid) {
  var op = $('<option></option>').attr('value',dpid).text(dpid);
  $('#node-select').append(op);
}

var populateListNum = function(select, data, sel) {
    var items = [];
    $.each(data, function (id, option) {
        if ($.inArray(id,sel)>=0 || sel.length==0) {
          items.push('<li>'+id+':  '+option.toFixed(6)+'</li>');
        }
    });  
    select.html(items.join(''));
}

var populateDPSpecs = function (dpid) {
  var specs = $('#specs');
  var data = pf_data.node_data[dpid];
  $('#select-brand').val(data.switch_brand);
  $('#select-model').val(data.queueing_model);
  
  $('#arrival-rate').val(data.adjustments['arrival_rate'].toFixed(2));
  $('#service-rate').val(data.adjustments['service_rate'].toFixed(2));
  $('#queue-capacity').val(data.adjustments['queue_capacity']);
  
  // populateListNum($('#switch-output'),data.output,[]);
  update_gui();
}

var setControlPanelListeners = function() {
  // var dpid = $('#node-select').val(); // cannot be here -> closure.. dpid == default OTL
  $('#select-brand').change(function() {
    var dpid = $('#node-select').val();
    console.log(dpid);
    pf_data.set_config(dpid, 'switch_brand', $('#select-brand').val());
    populateDPSpecs(dpid);
  });
  $('#select-model').change(function() {
    var dpid = $('#node-select').val();
    pf_data.set_config(dpid, 'queueing_model', $('#select-model').val());
    populateDPSpecs(dpid);
  });
  
  $('#arrival-rate').change(function() {
    var dpid = $('#node-select').val();
    pf_data.set_adjustment(dpid, 'arrival_rate', $('#arrival-rate').val());
    console.log('adjusted arrival');
    populateDPSpecs(dpid);
  });
  $('#service-rate').change(function() {
    var dpid = $('#node-select').val();
    pf_data.set_adjustment(dpid, 'service_rate', $('#service-rate').val());
    console.log('adjusted service');
    populateDPSpecs(dpid);
  });
  $('#queue-capacity').change(function() {
    var dpid = $('#node-select').val();
    var val = $('#queue-capacity').val();
    if (val < 0) val = 0;
    val = Math.round(val);
    pf_data.set_adjustment(dpid, 'queue_capacity', val);
    console.log('adjusted queue capacity');
    populateDPSpecs(dpid);
  });
}

$(document).ready(function() {
  var select = $('#node-select')
  select.change(function() {
    if (select.val() === 'default') {
      $('#specs').hide();
      return;
    }
    populateDPSpecs(select.val());
    $('#specs').show();
  });
  setControlPanelListeners();
  arrival_graph = d3.select("body").append("div")
          .attr("id", "graphs")
          .attr("width", CONF.force.width)
});

var arrival_graph = "";