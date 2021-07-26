// Copyright 2021 Tom Brown

// This program is free software; you can redistribute it and/or
// modify it under the terms of the GNU Affero General Public License as
// published by the Free Software Foundation; either version 3 of the
// License, or (at your option) any later version.

// This program is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
// GNU Affero General Public License for more details.

// License and more information at:
// https://github.com/PyPSA/pypsa-server


assumptions = {"co2_limit" : 0.,
	       "frequency" : 193,
	       "land_transport_electric_share" : 0.85,
	       "land_transport_fuel_cell_share" : 0.15,
	       "bev_dsm" : true,
	       "v2g" : true,
	       "central" : true,
	       "tes" : true,
	       "reduce_space_heat_exogenously_factor" : 0.29,
	       "St_primary_fraction" : 0.3,
	       "HVC_primary_fraction" : 0.6,
	       "co2_sequestration_potential" : 200,
	       "solar_potential" : 1.0,
	       "onwind_potential" : 1.0,
	       "offwind_potential" : 1.0,
	       "solar_cost" : 302,
	       "onwind_cost" : 963,
	       "offwind_cost" : 1416,
	       "electrolysis_cost" : 500,
	       "h2_pipeline_cost" : 267,
	       "co2_sequestration_cost" : 20,
	      };


for (let i = 0; i < Object.keys(assumptions).length; i++){
    let key = Object.keys(assumptions)[i];
    let value = assumptions[key];
    if(typeof value === "boolean"){
	document.getElementsByName(key)[0].checked = value;
	d3.selectAll("input[name='" + key + "']").on("change", function(){
	    assumptions[key] = this.checked;
	    console.log(key,"changed to",assumptions[key]);
	});
    }
    else{
	document.getElementsByName(key)[0].value = value;
	d3.selectAll("input[name='" + key + "']").on("change", function(){
	    assumptions[key] = this.value;
	    console.log(key,"changed to",assumptions[key]);
	});
    }
};



var solveButton = d3.select("#solve-button");

var solveButtonText = {"before" : "Solve",
		       "after" : "Solving"}


var jobid = "";

var timer;
var timeout;
var timerStart;
var timerExpected = 10;


// time between status polling in milliseconds
var poll_interval = 2000;

// time out for polling if it doesn't finish after 10 minutes
// Shouldn't be divisible by poll_interval
var poll_timeout = 10*60*1000 + poll_interval/2;


function solve() {
    if (solveButton.text() == solveButtonText["before"]) {
	var send_job = new XMLHttpRequest();
	send_job.open('POST', './jobs', true);
	send_job.setRequestHeader("Content-Type", "application/json");
	send_job.onload = function () {
	    var data = JSON.parse(this.response);
	    if("jobid" in data){
		jobid = data["jobid"];
		console.log("Jobid:",jobid);
		timer = setInterval(poll_result, poll_interval);
		timerStart = new Date().getTime();
		console.log("timer",timer,"polling every",poll_interval,"milliseconds");
		timeout = setTimeout(poll_kill, poll_timeout);
		solveButton.text(solveButtonText["after"]);
		solveButton.attr("disabled","");
		document.getElementById("status").innerHTML="Sending job to solver";
	    } else if("status" in data && data["status"] == "Error") {
		console.log("results:", data);
		document.getElementById("status").innerHTML = data["status"] + ": " + data["error"];
	    } else {
	    };
	};
	send_job.send(JSON.stringify(assumptions));
    };
};


solveButton.on("click", solve);



function poll_result() {

    var poll = new XMLHttpRequest();

    poll.open('GET', './jobs/' + jobid, true);

    poll.onload = function () {
	results = JSON.parse(this.response);
	status = results["status"];
	document.getElementById("status").innerHTML=status;
	console.log("status is",status);

	if(status == "Error"){
	    clearInterval(timer);
	    clearTimeout(timeout);
	    console.log("results:",results);
	    document.getElementById("status").innerHTML=status + ": " + results["error"];
	    solveButton.text(solveButtonText["before"]);
	    $('#solve-button').removeAttr("disabled");
	};
	if(status == "Finished"){
	    clearInterval(timer);
	    clearTimeout(timeout);
	    console.log("results:",results);
	    solveButton.text(solveButtonText["before"]);
            document.getElementById("status").innerHTML='Finished. Results can be viewed at <a href="results/' + jobid + '">' + jobid + '</a>.' ;
	    $('#solve-button').removeAttr("disabled");
	};
    };
    poll.send();
};





function poll_kill() {
    clearInterval(timer);
    solveButton.text(solveButtonText["before"]);
    $('#solve-button').removeAttr("disabled");
    document.getElementById("status").innerHTML="Error: Timed out";
};
