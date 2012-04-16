green = '#10d010';
red = '#d01010';
yellow = '#f4fd01';
black = '#000000';
blue = '#7474cf';

getNodes = function () {
		return network['nodes'];
		}

Simulator = {
		jSBGN: null,			// a reference to the network
		SVG: null,			// a reference to the inline SVG

		Statespace: {},
		reset_Statespace: {},
		SimulationRunning: false,
		Nodes_getting_updated: {},
		updateUI_process: null,

		VisualProperties:	{
					active: green;
					inactive: '#ffffff';
					cyclic_attraktor: '#f9f883';
					},

		initialize: function () {
				this.SimulationRunning = false;
				this.reset_Statespace = {};
				this.Nodes_getting_updated = {};
				for (n in getNodes) {
					this.reset_Statespace[getNodes[n]] = true;
					this.Nodes_getting_updated[getNodes[n]] = true;
					}
				this.Statespace = deepcopy(this.reset_Statespace);
				this.updateUI_process = null;
				}

		extractNetworkUpdateRules: function() {
				},

		SVGonClick: function(event) {
				node = event.srcElement.id;
				if (event.ctrlKey)
					this.Nodes_getting_updated[node] = ! this.Nodes_getting_updated[node];
				else
					this.Statespace[node] = ! this.Statespace[node];
				RefreshGraph();
				},

		installSVGonClickListeners: function() {
				for (n in getNodes())
					svg.getElementById(getNodes[n]).onclick = SVGonClick;
				},

		function updateUI() {
			graph_refresh_required = false;
		//		document.getElementById('debug').innerHTML += '.';
			for (n in getNodes) {
				node = svg.getElementById(getNodes[n]);

				desired = inactive;
				undesired = active;
				if ( this.Statespace[getNodes[n]] ) {
					temp = desired;
					desired = undesired;
					undesired = temp;
					}
				current = node.getAttribute('fill');
				if ( current.toLowerCase() != desired.toLowerCase() ) {
					graph_refresh_required = true;
					node.setAttribute('fill', FadeColor(undesired, current, desired));
		//				if ( node.id == 'Glucose' )
		//					document.getElementById('debug').innerHTML += current+' != '+desired+': set to '+FadeColor(undesired, current, desired)+'; ';
					}

				desired = 'none';
				undesired = '3,3';
				if ( ! this.Nodes_getting_updated[getNodes[n]] ) {
					temp = desired;
					desired = undesired;
					undesired = temp;
					}
				current = node.getAttribute('stroke-dasharray');
				if ( current != desired ) {
		//				alert(current+' != '+desired);
		//				graph_refresh_required = true;
					node.style['stroke-dasharray'] = desired;
					}
				}
			if ( this.updateUI_process != null ) {
				window.clearTimeout(this.updateUI_process);
				this.updateUI_process = null;
				}
			if ( graph_refresh_required )
				this.updateUI_process = window.setTimeout('updateUI();', 20);
			},

		function Import(evt) {
			var reader = new FileReader();
			reader.readAsText(evt.srcElement.files[0]);
			reader.onload = StateLoaded;
			},

		function SaveState() {
			},

		function StateLoaded(evt) {  
			var fileString = evt.target.result;
		//	alert(fileString);
			try	{
				obj = JSON.parse(fileString);
				}
			catch(err) {
				alert(err);
				}
			finally {
				for (key in obj) {
					alert(key);
					}
				}
			},

		function LoadState(evt) {
			var reader = new FileReader();
			reader.readAsText(evt.srcElement.files[0]);
			reader.onload = StateLoaded;
			},

		function CompareState() {
			},

		function ResetState() {
			document.getElementById('Progress').innerHTML = 'Resetting ...';
			this.Statespace = deepcopy(this.reset_Statespace);
			updateUI();
			document.getElementById('Progress').innerHTML = 'Reset.';
			},

		function Iterate() {
			this.SimulationRunning = true;

			// messages
			e = document.getElementById('Progress');
			if ( e.innerHTML.length > 30 || e.innerHTML.substr(0,9) != 'Iterating' )
				e.innerHTML = 'Iterating ...'
			else	e.innerHTML = e.innerHTML+'.';
			steps = document.getElementById('Steps');
			steps.innerHTML = parseInt(steps.innerHTML)+1;

			// calculation
			some_statespace_update = false;
			some_update = false;
			var updated_Statespace = deepcopy(this.Statespace);
			for (node in update_rules)	// for key in hash
				if ( this.Nodes_getting_updated[node] ) {
					updated_Statespace[node] = eval( update_rules[node] );
					some_statespace_update = some_statespace_update || ( updated_Statespace[node] != this.Statespace[node] );
					}

			// steady state ?
			if ( some_statespace_update ) {	// network updated -> steady state not reached
				graph_refresh_required = true;
				this.Statespace = updated_Statespace; // don't deepcopy: old Statespace is discarded
				try { delay=parseInt(document.getElementById('Delay').value);	}
				catch(err) { delay=120;	}
				window.setTimeout('Iterate();', delay);
				if ( this.updateUI_process == null )
					updateUI();
				}
			else 	{	// no changes -> steady state
				updateUI();
				e.innerHTML = 'Boolean network reached steady state.';
				this.SimulationRunning = false;
				}
			},

		function RefreshGraph() {
			document.getElementById('Progress').innerHTML = 'Refreshing graph ...';
			if ( this.updateUI_process == null )
				updateUI();
			// start Simulation, if it's not running already
			if ( ! this.SimulationRunning ) {
				document.getElementById('Steps').innerHTML = 0;
				Iterate();
				}
			document.getElementById('Progress').innerHTML = 'Graph refreshed.';
			},

		function selectScenario(event) {
			eval(event.srcElement.options[event.srcElement.selectedIndex].value);
			},

		function refreshSVG() {
			document.network.style.visibility = "hidden";
			document.network.style.visibility = "visible";
			},

		bringtoFront: function(element) {
			cache = element;
			alert(element);
			graph.removeChild(svg.getElementById(element));
			graph.appendChild(svg.getElementById(cache));
			},

		colorifyAttractorEdge: function(node1, node2) {
			path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
			path.setAttributeNS(null, 'style', 'fill:none; stroke:#f9f883; stroke-width:80; stroke-linecap:round; opacity:0.6;');
			x1 = svg.getElementById(node1).cx.baseVal.value;
			y1 = svg.getElementById(node1).cy.baseVal.value;
			x2 = svg.getElementById(node2).cx.baseVal.value;
			y2 = svg.getElementById(node2).cy.baseVal.value;
			path.setAttributeNS(null, 'd', 'M '+x1+','+y1+' '+x2+','+y2);
			graph.appendChild(path);
		//		bringtoFront(node1);
		//		bringtoFront(node2);
			},

		FindAttractors: function() {
			// query the server via XmlHttpRequest ... BooleanNet python simulation ...

		//		polygon = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
		//		polygon.setAttributeNS(null, 'fill', cyclic_attraktor);
		//		polygon.setAttributeNS(null, 'points', '-1,1 -1,-100 100,-100 100,1 -1,1');

			colorifyAttractorEdge('Ras2', 'cAMP');
			colorifyAttractorEdge('cAMP', 'PKA');
			colorifyAttractorEdge('PKA', 'Ras2');
			refreshSVG();
			},

		EditNetwork: function() {
			doc = window.open('', 'Edit Boolean Network', 'width=350, menubar=0, toolbar=0, location=0, status=1').document;
			doc.writeln("<table>");
			doc.writeln("<tr>");
			doc.writeln("	<td><b>Nodes getting updated</b></td>");
			doc.writeln("	<td><b>Update rules</b></td>");
			doc.writeln("</tr>");
			doc.writeln('<tr>');
			doc.writeln('	<td><input type=button value="Save"/><input type=button value="Cancel" onClick="window.close();"/></td>');
			doc.writeln('	<td>JavaScript syntax: || = OR, && = AND, ! = NOT</td>');
			doc.writeln('</tr>');
			for (n in getNodes) {
				doc.writeln('<tr>');
				doc.writeln('	<td><input type=checkbox checked>'+getNodes[n]+'</td>');
		//			rule = '\b\r\b'.exec()
				rule = update_rules[getNodes[n]];
				if ( rule == undefined )
					rule = '';
				else
					rule = replaceAll(replaceAll(rule, '"]', ''), 'Statespace["', '')
				doc.writeln('	<td><input type=text style="width:400px;" value=\''+rule+'\'/></td>');
				doc.writeln('</tr>');
				}
			doc.writeln('<tr><td colspan=2>');
			doc.writeln('	<input type=button value="Save"/><input type=button value="Cancel" onClick="window.close();"/>');
			doc.writeln('</td></tr>');
			doc.close();
			},

		ViewPython: function() {
			doc = window.open('', 'View Python source', 'width=350, menubar=0, toolbar=0, location=0, status=1').document;
			doc.writeln('<textarea wrap=off style="width:99%;height:99%;overflow:scroll;">');
			doc.writeln(BooleanNetwork);
			doc.writeln('</textarea>');
			doc.close();
			}

		}; // Simulator

