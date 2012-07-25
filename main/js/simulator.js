var trans, serverURL;
var jSBGN;
var importNetwork, getInitialSeed;

var Simulator = function() {
  
  this.running = false;
  this.scopes = false;
  
  var obj = this;
  var net;
  var delay;
  var ruleFunctions = {};
  
  var makeFunction = function(rule) {
    rule = rule.replace(/[A-Za-z0-9_]+/g, 
    function(text) { 
      if (text === 'true' || text === 'false')
        return text;
      return "state['" + text + "']"; 
    });
    return Function("state", "return " + rule + ";");
  };

  var sync = function(state) {
    var i, id;
    var changed = [];
    var newState = {};
    for (i in net.state) {
      newState[i] = ruleFunctions[i](state);
      if (newState[i] !== state[i]) 
        changed.push(i);
    }
    for (i in changed) {
      id = changed[i];
      state[id] = newState[id];
    }
    return changed;
  };
  
  var encodeMap = function(state) {  
    var map = '', i;  
    for (i in state) 
      map += +state[i];
    return map;  
  };
  
  var decodeMap = function(map) {
    var state = {}, i, j = 0;
    for (i in net.state)
      state[i] =  Boolean(parseInt(map[j++], 10));
    return state;  
  };
  
  var getInitStates = function() {
    var i, j;
    var initStates = [];
    for (i = 0; i < 30; i++) {
      initStates.push({});
      for (j in net.state) {
        initStates[i][j] = Boolean(Math.round(Math.random()));
      }
    }
    return initStates;
  };
  
  var randomColor = function() {
    var color = '#', i;
    for (i = 0; i < 6; i++) 
      color += Math.round(Math.random()*0xF).toString(16);
    return color;
  };
  
  var nodeColorUpdate = function(id) {
    var opacity;
    if (net.state[id]) 
      opacity = 1;
    else
      opacity = 0;
    $('#' + id + ' :eq(0)').css('fill', '#10d010').animate({'fill-opacity':opacity}, delay);
  };
  
  var iterate = function() {
    var changed, i;
    changed = sync(net.state);  
    if ( changed.length > 0 ) {   // network updated -> steady state not reached
      for (i in changed)
        nodeColorUpdate(changed[i]);
      setTimeout(function() { obj.run(); }, delay);		// iterate again
    }
    else {
      console.log('Boolean network reached steady state.');
      obj.stop();
    }
  };
  
  var nodeClick = function() { 
    
    var id = $(this).attr('id');
    net.state[id] = !net.state[id];
    nodeColorUpdate(id);
    if($('#oneclick').attr('checked') && !obj.running) 
      setTimeout(function() { obj.start(); }, delay);
  };
  
  var nodeHoverRule = function() {
    var id = $(this).attr('id');
    var rule = id + ' = ' + net.rules[id];
    $('<div/>', {id:'info', text: rule}).prependTo('#grn');
  };
  
  var nodeHoverStates = function() {
    var id = $(this).attr('id');
    var state = decodeMap(id), i;
    var info = '';
    for (i in state)
      info += i + ': ' + state[i] + '<br>';
    $('<div/>', {id:'info', html: info}).prependTo('#stg');
  };
  
  var nodeHoverRemove = function() {
    $('#info').remove();
  };
  
  var drawAttractors = function(doc, attractors) {
    var jsbgn = new jSBGN(); 
    var tmp = JSON.parse(sb.io.write(doc, 'jsbgn'));
    jsbgn.nodes = tmp.nodes;
    jsbgn.edges = tmp.edges;
    
    trans = importNetwork(jsbgn, '#stg');
    
    var color, cycle, i, j;
    for (i in jsbgn.nodes)
      $('#' + jsbgn.nodes[i].id).hover(nodeHoverStates, nodeHoverRemove);
    for (i in attractors) {
      cycle = attractors[i];
      color = randomColor();
      for (j in cycle)
        $('#' + cycle[j] + ' :eq(0)').css('fill', color);
    }
  };
  
  var applyGuessSeed = function() {
    
    $.ajax({
      url: serverURL + '/Simulate/InitialSeed',
      async: false,
      success: function(data) {
        var seed = JSON.parse(data), i;
        for (i in seed) {
          if(seed[i])
            net.state[i] = true;
          else
            net.state[i] = false;
        }
      }
    });
  };
  
  var exportStateJSON = function(states) {	
    var i, j;
    var exportStates = [];
    for (i in states) {
      exportStates.push({});
      for (j in states[i]) {
        if(states[i][j])
          exportStates[i][j] = 1;
        else
          exportStates[i][j] = 0;
      }
    }
    return JSON.stringify(exportStates);
  };

  var updateNodeRules = function(state) {	
    var i;
    for (i in state) {
      if(state[i])
        ruleFunctions[i] = function() { return true; };
      else
        ruleFunctions[i] = function() { return false; };
    }
  };
  
  this.init = function(jsbgn, simDelay, guessSeed) {
    net = jsbgn;
    delay = simDelay;
    net.state = {};
    
    $('#iteration').text(0);
    $('#simulation').click(this.start);
    $('#analyze').click(this.attractorSearch);
    
    var i;
    for (i in net.rules) {
      if(net.rules[i].length !== 0)
        net.state[i] = getInitialSeed();
    }
    if(this.scopes && guessSeed)
      applyGuessSeed();
    
    var svgNode;  
    for (i in net.state) {
      ruleFunctions[i] = makeFunction(net.rules[i]);
      svgNode = $('#' + i);
      if (svgNode !== null) {
        if(!this.scopes)
          svgNode.hover(nodeHoverRule, nodeHoverRemove);
        svgNode.click(nodeClick);
        nodeColorUpdate(i);
      }
    }
  };
  
  this.run = function() {

    if(!(this.running))
      return;
      
    $('#iteration').text(parseInt($('#iteration').text(), 10) + 1);
      
    if (this.scopes) {
      $.ajax({
        url: serverURL + '/Simulate/Iterate',
        type: 'POST',
        data: { state : exportStateJSON([net.state]) },
        success: function (resp) {
          updateNodeRules(JSON.parse(resp));
          iterate();
        }
      });
    }
    else
       iterate();
  };
  
  this.start = function() {
    obj.running = true;
    $('#simulation').unbind('click', obj.start);
    $('#simulation').click(obj.stop);
    $('#simulation').button( "option", "icons", {primary: 'ui-icon-pause'});
    $('#progress').show();
    $('#tabs').tabs('select', '#grn');
    obj.run();
  };

  this.stop = function() {
    obj.running = false;
    $('#simulation').unbind('click', obj.stop);
    $('#simulation').click(obj.start);
    $('#simulation').button( "option", "icons", {primary: 'ui-icon-play'});
    $('#progress').hide();
  };
  
  this.destroy = function() {
    $('#simulation').unbind('click', obj.start);
    $('#analyze').unbind('click', obj.attractorSearch);
  };
  
  this.attractorSearch = function() {
    var doc = new sb.Document();
    doc.lang(sb.Language.AF);
    
    var i, j;
    var initStates = getInitStates();
    
    if(obj.scopes) {
      var statesList;
      $.ajax({
        url: serverURL + '/Simulate/AttractorSearch',
        type: 'POST',
        async: false,
        data: { states : exportStateJSON(initStates) },
        success: function (resp) {
          statesList = JSON.parse(resp);
        }
      });
    }
    
    var cycle, attractors = [];
    var map, prev, node, idx;
    var currStates, state;
    for (i in initStates) {
      state = initStates[i];
      currStates = [];
      prev = '';
      for(j = 0 ; ; j++) {
        map = encodeMap(state);
        node = doc.node(map);
        if(node !== null) {
          idx = currStates.indexOf(map);
          if (idx !== -1) {
            cycle = currStates.slice(idx);
            attractors.push(cycle);
          }
          if (prev.length > 0)
            doc.createArc(prev + '->' + map).type(sb.ArcType.PositiveInfluence).source(prev).target(map);
          break;
        }
        else {
          doc.createNode(map).type(sb.NodeType.SimpleChemical);
          if (prev.length > 0)
            doc.createArc(prev + '->' + map).type(sb.ArcType.PositiveInfluence).source(prev).target(map);
        }
        currStates.push(map);
        if(obj.scopes)
          updateNodeRules(statesList[i][j + 1]);
        sync(state);
        prev = map;
      }
    }
    
    drawAttractors(doc, attractors);
  };

  
};
