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
		var top = (cfg.render.xaxis === 'top')
		var offset = (top ? 10 : cfg.h)
		var textoffset = (top ? 0 : cfg.h)
		var texttrans = (top ? -5 : 5)

		/* Grouping */
		var ticks = chart.selectAll('.tick')
			.data(xScale.ticks(30))
			.enter().append('svg:g')
			.attr('transform', dsel)
			.attr('class', cfg.defaults.timeaxis);
	    
		/* Tick Marks  */
        if ( !top ) {
  			ticks.append("svg:line")
				.attr("x1", 0)
				.attr("x2", 0)
				.attr("y1", offset-10)
  				.attr("y2", offset);
		}

		/* Labels */
		ticks.append("svg:text")
			.text(x_fmt)
			.style("fill", "grey")
			.attr("font-size", "10px")
			.attr("text-anchor", (top ? "begin" : "end"))
			.attr("transform", "translate(5 5) rotate(270 0 " + textoffset + ")")
			.attr("y", textoffset);
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

    minmax: function(data) {
		return _.reduce(data, function (mm,val) { 
			mm.min = (mm.min !== null) ? Math.min(mm.min, val) : val
			mm.max = (mm.max !== null) ? Math.max(mm.max, val) : val
			return mm
		}, {min: null, max: null});
	},

    range: function(data, scale) {
		var mm = this.minmax(data)
        var upper = scale(mm.max);
        var lower = scale(mm.min);
        var range = Math.abs(upper - lower); 
		return range;
	},

    centroid: function(data) {
		var mm = this.minmax(data);
		var hd = (mm.max - mm.min);
        if ( hd == 0 ) {
			return mm.min;
		} else {
			return mm.min + hd / 2;
		}
		return center;
	},

    xScale: function(dates,cfg) {
		var min;
		var max;
		if ( cfg.start == null && cfg.end == null && dates.length > 0 ) {
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
		if (_.isNumber(min) && _.isNumber(max)) {
  			return d3.time.scale()
	          .domain([min, max])
	          .range([0,cfg.w]);
		} else {
            return null;
		}
    },
    
    yScale: function(data,cfg) {
		var min;
		var max;
        if ( cfg.dataMin == null && data.length > 0 ) {
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

		if (_.isNumber(min) && _.isNumber(max)) {
          return d3.scale.linear()
              .domain([min, max])
  		      .nice()
              .range([cfg.h,0]);
		} else {
		  return null;
		}
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


    dashedLine: function (chart, yscaled, cfg) {
        chart.append("line")
			.attr('stroke', 'grey')
			.attr('stroke-width', '1px')
            .attr('stroke-dasharray', '5,5')
            .attr('stroke-opacity', '0.5')
			.attr('x1', 0)
			.attr('y1', yscaled)
            .attr('x2', cfg.w)
			.attr('y2', yscaled)
	},

    solidLine: function (chart, yscaled, cfg) {
        chart.append("line")
			.attr('stroke', 'grey')
			.attr('stroke-width', '1px')
            .attr('stroke-opacity', '0.5')
			.attr('x1', 0)
			.attr('y1', yscaled)
            .attr('x2', cfg.w)
			.attr('y2', yscaled)
	},

    renderData: function (chart,series,xscale,yscale,cfg,mean) {
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

            this.solidLine(chart, yscale(mean), cfg);

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
			.style("fill", region.color || "red")
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

    renderSignificantEvents: function (chart, xscale, yscale, sigs) {
		_.each(sigs, function (sig) { 
            if ( sig.type === "point" ) {
 				var x = xscale(sig.ts);
				var y = yscale(sig.v);
				var radius = 10;        
				chart.append("circle")
  					.style("stroke", "red")
					.style("fill", "none")
					.attr("cx", x)
					.attr("cy", y)
					.attr("r", radius)
			} else if ( sig.type === "sequence" ) {
				var ts = _.pluck( sig.points, 'ts' )
				var vs = _.pluck ( sig.points, 'v' )
				var x = xscale( this.centroid( ts ) );
                var rx = this.range( ts, xscale ) * 0.75;
                var y = yscale( this.centroid ( vs ) );
                var ry = this.range( vs, yscale ) * 0.75;
				chart.append("ellipse")
				    .style("stroke", "red")
				    .style("fill", "none")
				    .attr("cx", x)
				    .attr("cy", y)
				    .attr("rx", rx)
				    .attr("ry", ry)
			}
		}, this);
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

    renderSeries: function (chart, series, xscale, yscale, cfg) {
        data = series.data;
		cfg.start = series.start;
		cfg.end = series.end;
		cfg.dataMin = series.dataMin;
		cfg.dataMax = series.dataMax;

		/* Configure Chart Boundaries */
		if (cfg.render.xaxis && xscale) {
			this.renderTimeAxis(chart,xscale,cfg);
		}
		if (cfg.render.yaxis && yscale) {
  			this.renderValueAxis(chart,yscale,0,cfg);
		}
		if (data.length > 0 && xscale && yscale) {
  			this.renderData(chart,data,xscale,yscale,cfg,true);
		}
	},

    isValidSeries: function (series) {
        return (series.data != null) && (series.data[0] != null) && (_.isNumber(series.data[0].v));
	},

    renderChart: function (cid,dataset,cfg) {
		var extra = cfg.h + ( cfg.render.xaxis ? cfg.margin*3 : cfg.margin )
		var topmargin = ( cfg.render.xaxis === 'top' ? cfg.margin*2 : cfg.margin )

		var chart = d3.selectAll(cid).append("svg")
			.attr("width", cfg.w + cfg.margin*3)
			.attr("height", extra)
			.append("g")
			.attr("transform", "translate(" + cfg.margin * 2.5 + "," + topmargin + ")");

		/* Title */
		if ( cfg.title ) {
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

        var series = dataset.series;
        var primary = series[0]
		var pdata = primary.data
		cfg.start = primary.start;
		cfg.end = primary.end;
		cfg.dataMin = primary.dataMin;
		cfg.dataMax = primary.dataMax;
		var ds = _.pluck(pdata, 'ts')
		var vs = _.pluck(pdata, 'v')
		var xscale = this.xScale(ds, cfg);
		var yscale = this.yScale(vs, cfg);

        /* Control Lines */
        if ( primary.ctrl && primary.ctrl.ucl ) {
			console.log('render ucl')
            this.dashedLine(chart, yscale(primary.ctrl.ucl), cfg)
		}

        if ( primary.ctrl && primary.ctrl.lcl ) {
			console.log('render lcl')
            this.dashedLine(chart, yscale(primary.ctrl.lcl), cfg)
		}

		/* Render regions if provided */
        if (primary.regions) {
			_.each(primary.regions, function (region) {
                if (region.type === 'area')
     			    this.renderRegionHighlight(chart, xscale, region, cfg);
                else if (region.type === 'label')
                    this.renderLabelHighlight(chart, xscale, region, cfg);
			}, this);
		}

		/* Main data series, only plot axes of first series */
		if (series.length > 0) {
            if (!this.isValidSeries(primary)) {
   			    primary.data = [];
		    }
			this.renderSeries(chart, primary, xscale, yscale, _.extend({}, cfg));
			_.each(_.rest(series), function (s) {
                _cfg = _.extend({},cfg);
                _cfg.xaxis = false
                _cfg.yaxis = false
				this.renderSeries(chart,s,xscale,yscale,cfg);
			}, this);
		}
		if ( primary.data.length === 0 ) {
			chart.append("svg:text")
			    .attr("x", cfg.w/2)
			    .attr("y", cfg.h/2)
				.attr("text-anchor", "middle")
			    .style("stroke", "none")
			    .style("fill", "black")
			    .text("No Data Found")
            return null;
		}

        /* Significant events */
        if ( primary.significance !== undefined && primary.significance.length > 0 ) {
			this.renderSignificantEvents(chart, xscale, yscale, primary.significance);
		}
		
        /* Render callouts if provided */
        if ( primary.callouts !== undefined && primary.callouts.length > 0 ) {
            _.each(data.callouts, function (callout) {
                _this.renderCallout(chart, xscale, yscale, callout, cfg);
			}, this);
		}
	},
};
    return QIchart;
});

})();


