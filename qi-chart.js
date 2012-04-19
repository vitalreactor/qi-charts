/****

TODO:

Datapoint Definitions
  - All points are structs
  - Types for points: data, missing, event(?)

Metadata
  - periods -> shading regions, annotated regions
  - events -> box & arrow annotations

Control Charts
  - UCL/LCL
  - Points above/below UCL/LCL
  - Runs of points above/below mean

*****/

(function () {
define( ["jquery", "use!Underscore", "use!D3", "use!D3time", ],
function ($, _, d3) { 

var QIchart = {
	renderTimeAxisD: function (chart,xScale,cfg) {
		var axis = d3.svg.axis().scale(xScale).orient("bottom");
		chart.append("g")
			.attr("transform", "translate(0, " + cfg.h + ")")
			.call(axis);
	},

    renderTimeAxis: function (chart,xScale,cfg) {

	var x_fmt = xScale.tickFormat(30); // d3.time.format("%m/%e"); // 
	var dsel = function (d) { return "translate( " + xScale(d) + " 0)"; }

	/* Grouping */
	var ticks = chart.selectAll('.tick')
			.data(xScale.ticks(30))
			.enter().append('svg:g')
			.attr('transform', dsel)
			.attr('class', cfg.defaults.timeaxis);
	    
	/* Tick Marks  */
	ticks.append("svg:line")
			.attr("x1", 0)
			.attr("x2", 0)
			.attr("y1", cfg.h-10)
  			.attr("y2", cfg.h);

	/* Labels */
	ticks.append("svg:text")
			.text(x_fmt)
			.style("fill", "grey")
			.attr("font-size", "10px")
			.attr("text-anchor", "end")
			.attr("transform", "translate(5 5) rotate(270 0 " + cfg.h + ")")
			.attr("y", cfg.h);
    },

    renderValueAxis: function(chart,yScale,offset,cfg) {

	/* Axis Line */
	chart.append("line")
	    .style("stroke", "grey")
	    .style("stroke-width", "2px")
	    .attr("x1", 0)
	    .attr("x2", 0)
	    .attr("y1", 0)
	    .attr("y2", cfg.h);

	/* Heading */
	var ticks = chart.selectAll('.tick')
	    .data(yScale.ticks(5))
	    .enter().append('svg:g')
	    .attr('transform', function(d) {
		      return "translate(0, " + yScale(d) + ")";
         })
	    .attr('class', cfg.defaults.valueaxis || "vaxis")

	/* Tick Marks */
	ticks.append("svg.line")
	    .attr("x1", 0)
	    .attr("x2", 10)
	    .attr("y1", 0)
	    .attr("y2", 0);

	/* Labels */
	ticks.append("svg:text")
	    .attr("text-anchor", "end")
	    .attr("transform", "translate(-7 0)")
        .style("fill", "grey")
        .style("stroke", "none")
	    .attr("x", 0)
	    .attr("y", 0)
	    .text(String);
	
    },

    mean: function(data) {
	    return _.reduce(data, function (a,b) { return a + b; }) / _.size(data);
    },

    xScale: function(dates,cfg) {
		var min;
		var max;
		console.log([cfg.start, cfg.end]);
		if ( cfg.start == null && cfg.end == null ) {
			min = d3.min(dates);
			max = d3.max(dates);
/*
			var range = max - min;
			var diff = range*0.01;
			min = min - diff;
			max = max + diff;
*/
		} else {
			min = cfg.start;
			max = cfg.end;
		}
	    return d3.time.scale()
	        .domain([min, max])
	        .range([0,cfg.w]);
    },
    
    yScale: function(data,cfg) {
		var min;
		var max;
        if ( cfg.dataMin == null ) {
			min = d3.min(data);
			max = d3.max(data);
			var range = max - min;
			var diff = range*0.05;
			min = min - diff;
			max = max + diff;
		} else {
			min = cfg.dataMin;
			max = cfg.dataMax;
		}

        return d3.scale.linear()
            .domain([min, max])
		    .nice()
            .range([cfg.h,0]);
    },

    isWeekend: function (ts) {
		var date = new Date(ts);
        var day = date.getDay();
        if (day == 0 || day == 6) {
			return true
		} else {
			return false
		}
	},

    renderSeries: function (chart,series,xscale,yscale,cfg,mean) {
        var xsel = function (d,i) { return xscale(d.ts); }
        var ysel = function (d,i) { return yscale(d.v); }
        var titlesel = function (d,i) { 
			if ( d.tooltip != null ) {
				return d.tooltip;
			} else {
				var date = new Date(d.ts);
				return date.toString("ddd MMM dd, yyyy htt") + " | " + 
					Math.round(d.v * 100) / 100;
			}
		}

        var me = this;
        var color = function (d,i) {
			if ( me.isWeekend(d.ts) == true ) {
				return "lightgrey";
			} else {
				return "steelblue";
			}
		}

        if ( cfg.render.path ) {
			chart.selectAll("path.line")
				.data([series])
				.enter().append("svg:path")
				.attr("d", d3.svg.line()
					  .x( xsel )
					  .y( ysel ))
				.attr("stroke-linejoin", "round")
				.attr("stroke", "#9ae")
				.attr("stroke-width", "2px")
				.attr("fill", "none");
		}

		chart.selectAll("circle")
			.data(series)
			.enter().append("circle")
			.attr("class", cfg.defaults.glyph)
			.style("fill", color)
			.style("stroke", color)
			.attr("cx", xsel)
			.attr("cy", ysel)
			.attr("r", 4)
		    .attr("rel", "tooltip")
            .attr("data-original-title", titlesel)
            .on('mouseover', function () { 
				$(d3.event.target).tooltip('show');
			}, true)
		    .on('mouseout', function () {
				$(d3.event.target).tooltip('hide');
			}, true);

		/* Mean line  */
		if (mean) {
    	    var mean = this.mean(_.pluck(series, 'v'));

			chart.append("line")
				.attr("stroke-width", "1px")
				.attr("stroke", "grey")
				.attr("fill", "grey")
				.attr("stroke-opacity", "0.5")
				.attr("x1", 0)
				.attr("y1", yscale(mean))
				.attr("x2", cfg.w)
				.attr("y2", yscale(mean));

			if ( cfg.render.meanOffsets ) {
				chart.selectAll("line")
					.data(series)
					.enter().append("line")
					.style("stroke", "grey")
					.attr("x1", xsel)
					.attr("y1", ysel)
					.attr("x2", xsel)
					.attr("y2", yscale(mean))
			}
		};

    },

    renderRegionHighlight: function (chart, xScale, region, cfg) {
		var x1 = xScale(region.start, cfg);
		var x2 = xScale(region.end, cfg);
		var width = x2 - x1;

		chart.append('rect')
			.style("fill", "red")
			.style("fill-opacity", 0.1)
			.attr("x", x1)
			.attr("y", 0)
			.attr("height", cfg.h)
			.attr("width", width);
	
		if (region.label) {
			chart.append('text')
				.attr("x", x1 + (x2 - x1) / 2)
				.attr("y", 20)
				.attr("text-anchor", "middle")
				.style("fill", "black")
				.style("stroke", "none")
				.text(region.label);
		}

    },
  
    boundingBox: function (chart, cfg) {
		chart.append('rect')
			.style("stroke", "grey")
			.style("fill", "none")
			.attr("x", 0)
			.attr("y", 0)
			.attr("width", cfg.w)
			.attr("height", cfg.h);
    },

    runChart: function (cid,data,cfg) {
		var extra;
        if ( cfg.render.xaxis ) {
			extra = cfg.h + cfg.margin*3;
		} else {
			extra = cfg.h + cfg.margin;
		}

		console.log(extra);
		var chart = d3.selectAll(cid).append("svg")
			.attr("width", cfg.w + cfg.margin*2.5)
			.attr("height", extra)
			.append("g")
			.attr("transform", "translate(" + cfg.margin * 2.5 + "," + cfg.margin + ")");

        var series = data.series;
		if ( series.length > 0 ) {
			cfg.start = data.start;
			cfg.end = data.end;
			cfg.dataMin = data.dataMin;
			cfg.dataMax = data.dataMax;

			var ds = _.pluck(series, 'ts')
			var vs = _.pluck(series, 'v')

			var xscale = this.xScale(ds, cfg);
			var yscale = this.yScale(vs, cfg);

/*		this.boundingBox(chart, cfg); */
			if (cfg.render.xaxis) {
				console.log('render xaxis')
				this.renderTimeAxis(chart,xscale,cfg);
			}
			if (cfg.render.yaxis) {
				console.log('render yaxis')
  				this.renderValueAxis(chart,yscale,0,cfg);
			}
			if (series.length > 0) {
				console.log('render series')
  				this.renderSeries(chart,series,xscale,yscale,cfg,true);
			}
		} else {
			console.log('render no data')
			chart.append("svg:text")
			    .attr("x", cfg.w/2)
			    .attr("y", cfg.h/2)
				.attr("text-anchor", "middle")
			    .style("stroke", "none")
			    .style("fill", "black")
			    .text("No Data Found")
		}

		/* Title */
		if ( cfg.title ) {
			console.log('render title: ' + cfg.title)
			var midX = -cfg.margin*2;
			var midY = cfg.h / 2;

			chart.append("svg:text")
				.attr("x", midX)
				.attr("y", midY)
				.style("fill", "black")
				.style("stroke", "none")
				.attr("text-anchor", "middle")
			    .attr("transform", "rotate(-90 " + midX + " " + midY + ")")
			    .attr("font-size", "10px")
				.text(cfg.title); 
		}

		/* Render regions if provided */
        if (data.regions) {
            _this = this;
			_.each(data.regions, function (region) {
   				_this.renderRegionHighlight(chart, xscale, region, cfg);
			});
		}
    },

    // CONTROL CHART 
    controlChart: function (cid,d,cfg) {
  		alert( 'not implemented' );
    }
};
    return QIchart;
});

})();


