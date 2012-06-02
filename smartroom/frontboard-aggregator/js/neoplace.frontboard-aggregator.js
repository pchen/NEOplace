/*jshint browser: true, devel: true */
/*globals Sail, jQuery, _, Rollcall */

var NEOplace = window.NEOplace || {};

NEOplace.FrontBoardAggregator = (function() {

    // TODO: move this out to config.json
    //var assetsUrl="http://localhost/mywebapps/PlaceWeb.GitHub/NEOplace/smartroom/frontboard-aggregator/equations/";
    var assetsUrl="http://neoplace.aardvark.encorelab.org/smartroom/frontboard-aggregator/equations/";

    var self = {};

    self.name = "NEOplace.FrontBoardAggregator";

    self.cumulativeTagArray = [];

    self.init = function() {
        Sail.app.groupchatRoom = 'neo-a@conference.' + Sail.app.xmppDomain;

        // TODO: move this out to config.json
        Sail.app.username = "neo-frontwall-2";
        Sail.app.password = "22d5d010a45fac5b72bc151e60bf60dc8bc089a8";

        Sail.modules
            .load('Strophe.AutoConnector', {mode: 'pseudo-anon'})
            .load('AuthStatusWidget')
            .thenRun(function () {
                Sail.autobindEvents(NEOplace.FrontBoardAggregator);
                jQuery(Sail.app).trigger('initialized');

                // TODO: add click bindings here

                return true;
            });
    };

    self.authenticate = function () {
        jQuery(self).trigger('authenticated');
    };

    // Define control variables
    var principlesOn = true;
    var problemsOn = true;
    var equationsOn = true;
    var variablesOn = true;
    var assumptionsOn = true;
    var absolutePositionOn = false;

    // Shows board and toolbars. This function is called when sail is connected.
    var showHtmlContent = function() {
        jQuery("#board").fadeIn("slow");
        jQuery("#toolbars").fadeIn("slow");
        jQuery("#board").show();
        jQuery("#toolbars").show();
    }

    // Renders default view. Show 4 quadrants
    var viewAllQuadrants = function () {
        var winHeight = $(window).height(),
            winWidth = $(window).width(),
            quadrantHeight = (winHeight/2)-30,
            quadrantWidth = (winWidth/2)-20;

        // show all
        jQuery("#quadrant-A").show();
        jQuery("#quadrant-B").show();
        jQuery("#quadrant-C").show();
        jQuery("#quadrant-D").show();

        $("#quadrant-A").animate({ 
            height: quadrantHeight+"px", 
            width: quadrantWidth+"px", 
        }, 1000);

        $("#quadrant-B").animate({ 
            height: quadrantHeight+"px", 
            width: quadrantWidth+"px", 
        }, 1000);

        $("#quadrant-C").animate({ 
            height: quadrantHeight+"px", 
            width: quadrantWidth+"px", 
        }, 1000);
        
        $("#quadrant-D").animate({ 
            height: quadrantHeight+"px", 
            width: quadrantWidth+"px", 
        }, 1000);
    }

    // Hides all quadrants. 
    var hideAllQuadrants = function() {
        jQuery("#quadrant-A").hide();
        jQuery("#quadrant-B").hide();
        jQuery("#quadrant-C").hide();
        jQuery("#quadrant-D").hide();
    }

    // Shows in fullscreen a given quadrant. Receives quadrant id
    var fullScreenOneQuadrant = function (quadrantId) {

        // for all quadrants load default
        if(quadrantId=="ALL")
        {
            viewAllQuadrants();
        } else {

            var winHeight = $(window).height(),
                winWidth = $(window).width()-4,
                quadrantHeight = winHeight-56;

            // hide all
            hideAllQuadrants();

            // set new size of the quadrant
            jQuery("#quadrant-"+quadrantId).show();

            $("#quadrant-"+quadrantId).animate({ 
                height: quadrantHeight+"px", 
                width: winWidth+"px", 
            }, 1000);
        }

        // highlight active option in UI
        jQuery("#fullscreen-toolbar a").removeClass("widget-box-selected");

        jQuery("#board-"+quadrantId).addClass("widget-box-selected");

    }

    // save data to mongo
    var submitFrontboardAggregatorData = function(obj1) {
    //self.submitFrontboardAggregatorData = function(obj) {
        ///*
        var obj = {
            field_name1:"hola anto",
            field_name1:"hola again"

        };
        //*/
        
        console.log('Starting to save frontboard_aggregator.');

        var sev = new Sail.Event('aggregator_submit', obj);
        
        //alert(Sail.app.config.mongo.url);

        jQuery.ajax(Sail.app.config.mongo.url + '' + "neo-a" + '/frontboard_aggregator', {
            type: 'post',
            data: obj,
            success: function () {
                console.log("Frontboard Aggregator saved: ", obj);
                Sail.app.groupchat.sendEvent(sev);
            },
            error: function (e) {
                console.log('some error when saving  frontboard_aggregator.');
            }
        });
    };


    /* 
        Adds element to target quadrant. 
        Recieves an object with data needed.
        This function is called when XMPP events are received.
    */
    var addElementToBoard = function (obj) {
        
        var divId = MD5.hexdigest(obj.name)+"-"+Math.floor((Math.random()*100)+1);

        // assumptions
        if(obj.css_class=="assumption" && obj.text!=""){
            
            var element = jQuery("<div id='"+divId+"' class='"+obj.css_class+"'>"+obj.name+"<br/><span class='assumption-fulltext'>"+obj.text+"</span></div>");

            // expand on double click
            element.dblclick(function () {
                
                var theFullText = $(this).text();
                var myDivId = $(this).attr("id");
                $("#"+myDivId + " span").first().fadeIn("slow");
                $("#"+myDivId + " span").first().show();

            });

            // contract on click
            element.click(function () {

                var myDivId = $(this).attr("id");
                $("#"+myDivId + " span").first().fadeIn("slow");
                $("#"+myDivId + " span").first().hide();

            });

        // equations
        } else if (obj.css_class=="equation" && obj.name!="") {
            
            // image version
            var element = jQuery("<div id='"+divId+"' class='"+obj.css_class+"'><img alt='"+obj.name+"' src='"+assetsUrl+"EQ"+obj.name+".jpg"+"'></div>");

            
            // TODO: render version
            //var element = jQuery("<div id='"+divId+"' class='"+obj.css_class+"'><div>"+parseEquationIdIntoString(obj.name)+"</div>");

            // TODO: force render here?
            //MathJax.Hub.Queue(["Typeset",MathJax.Hub]);

        } else {
            var element = jQuery("<div id='"+divId+"' class='"+obj.css_class+"'>"+obj.name+"</div>");
        }

        // bring the element to the top when clicked
        element.mousedown(bringDraggableToFront);

        element.fadeIn("slow");

        element.css('position', 'absolute'); 

        // make element dragable
        element.draggable({ containment: "#quadrant-"+ obj.board});


        // Calculte element's random position for each quadrant
        var winHeight = $(window).height(),
            winWidth = $(window).width(),
            quadrantHeight = winHeight/2,
            quadrantWidth = winWidth/2,
            tolerance = 185,
            Min = 0,
            Max = 0,
            left = 0,
            top = 0;

        if (obj.board=="A") {
            Min = 0;
            Max = quadrantWidth-tolerance;
            left = Min + (Math.random() * ((Max - Min) + 1));
    
            Min = 0;
            Max = quadrantHeight-tolerance;
            top = Min + (Math.random() * ((Max - Min) + 1));

        } else if (obj.board=="B") {
            Min = winWidth-quadrantWidth;
            Max = winWidth-tolerance;
            left = Min + (Math.random() * ((Max - Min) + 1));
    
            Min = 0;
            Max = quadrantHeight-tolerance;
            top = Min + (Math.random() * ((Max - Min) + 1));
            
        } else if (obj.board=="C") {
            Min = 0;
            Max = quadrantWidth-tolerance;
            left = Min + (Math.random() * ((Max - Min) + 1));
    
            Min = quadrantHeight;
            Max = (quadrantHeight*2)-tolerance;
            top = Min + (Math.random() * ((Max - Min) + 1));
        } else if (obj.board=="D") {
            Min = winWidth-quadrantWidth;
            Max = winWidth-tolerance;
            left = Min + (Math.random() * ((Max - Min) + 1));
    
            Min = quadrantHeight;
            Max = (quadrantHeight*2)-tolerance;
            top = Min + (Math.random() * ((Max - Min) + 1));
        }
        
        // set position 
        element.css('left', left + 'px');
        element.css('top', top + 'px');

        //console.log("Board: "+obj.board+"; left: "+left+"; top:"+top);

        // Add element to target board
        var board = jQuery("#quadrant-content-"+obj.board).prepend(element);

        
        if(!absolutePositionOn){
            jQuery("#quadrant-content-"+obj.board+" div").css('position', 'inherit');
        }

    }

    // Brings a .ui-draggable element to the front (via z-index).
    // This is meant to be used as a callback for jQuery event bindings,
    // so `this` is assumed to refer to the element you want to bring
    // to the front.
    var bringDraggableToFront = function () {
        var zs = jQuery('.ui-draggable').map(function() {
            var z = jQuery(this).css('z-index'); 
            return z === 'auto' ? 100 : parseInt(z, 10);
        }).toArray();
        var maxZ = Math.max.apply(Math, zs);
        jQuery(this).css('z-index', maxZ + 1);

        //test make make all position absolute
        //jQuery("#quadrant-content-A div").css('position', 'absolute');
    };

    self.events = {
        initialized: function (ev) {
            NEOplace.FrontBoardAggregator.authenticate();
        },

        'ui.initialized': function (ev) {

            // Define UI events and functions

            jQuery('#absolute-pos').click(function () {
                
                elementLink = jQuery('#absolute-pos');

                if(absolutePositionOn)
                {
                    absolutePositionOn = false;
                    jQuery("#quadrant-content-A div").css('position', 'inherit');
                    jQuery("#quadrant-content-B div").css('position', 'inherit');
                    jQuery("#quadrant-content-C div").css('position', 'inherit');
                    jQuery("#quadrant-content-D div").css('position', 'inherit');
                    elementLink.removeClass("widget-box-selected");
                } else {
                    absolutePositionOn = true;
                    jQuery("#quadrant-content-A div").css('position', 'absolute');
                    jQuery("#quadrant-content-B div").css('position', 'absolute');
                    jQuery("#quadrant-content-C div").css('position', 'absolute');
                    jQuery("#quadrant-content-D div").css('position', 'absolute');
                    elementLink.addClass("widget-box-selected");

                }
            });

            jQuery('#filter-principles').click(function () {
                
                elementLink = jQuery('#filter-principles');

                if(principlesOn)
                {
                    principlesOn = false;
                    jQuery(".principle").hide();
                    elementLink.removeClass("widget-box-selected");
                } else {
                    principlesOn = true;
                    jQuery(".principle").show();
                    elementLink.addClass("widget-box-selected");

                }
            });

            jQuery('#filter-problems').click(function () {
            
            elementLink = jQuery('#filter-problems');

                if(problemsOn)
                {
                    problemsOn = false;
                    jQuery(".problem").hide();
                    elementLink.removeClass("widget-box-selected");
                } else {
                    problemsOn = true;
                    jQuery(".problem").show();
                    elementLink.addClass("widget-box-selected");
                }
            });

            jQuery('#filter-equations').click(function () {

                elementLink = jQuery('#filter-equations');

                if(equationsOn)
                {
                    equationsOn = false;
                    jQuery(".equation").hide();
                    elementLink.removeClass("widget-box-selected");
                } else {
                    equationsOn = true;
                    jQuery(".equation").show();
                    elementLink.addClass("widget-box-selected");
                }
            });

            jQuery('#filter-variables').click(function () {
                
                elementLink = jQuery('#filter-variables');

                if(variablesOn)
                {
                    variablesOn = false;
                    jQuery(".variable").hide();
                    elementLink.removeClass("widget-box-selected");
                } else {
                    variablesOn = true;
                    jQuery(".variable").show();
                    elementLink.addClass("widget-box-selected");
                }
            });

            jQuery('#filter-assumptions').click(function () {
                elementLink = jQuery('#filter-assumptions');

                if(assumptionsOn)
                {
                    assumptionsOn = false;
                    jQuery(".assumption").hide();
                    elementLink.removeClass("widget-box-selected");
                } else {
                    assumptionsOn = true;
                    jQuery(".assumption").show();
                    elementLink.addClass("widget-box-selected");
                }
            });

            // adding functions for full screen 
            jQuery('#board-ALL').click(function () {

                fullScreenOneQuadrant("ALL");
            });

            jQuery('#board-A').click(function () {
                fullScreenOneQuadrant("A");
            });

            jQuery('#board-B').click(function () {
                fullScreenOneQuadrant("B");
            });

            jQuery('#board-C').click(function () {
                fullScreenOneQuadrant("C");
            });

            jQuery('#board-D').click(function () {
                fullScreenOneQuadrant("D");
            });
        },

        connected: function (ev) {
            console.log("Connected...");
            
            // Displaying content only when sails is connected.
            //loadAllEquations();
            showHtmlContent();
            viewAllQuadrants();
        },

        sail: {

            // Define Sail events and functions

            aggregator_submit: function(sev) {
                //console.log(sev);
                alert("frontboard aggregator data saved");
            },

            videowall_assumptions_variables_commit: function (sev) {
                _.each(sev.payload.variables, function (i) {
                    var variable = {
                        board:sev.payload.videowall,
                        name:i,
                        css_class:"variable"
                    }

                    // add to board
                    addElementToBoard(variable);
                });

                _.each(sev.payload.assumptions, function (i) {
                    
                    if(i.length>30){
                        shortName = i.substr(0,30)+ " ...";
                        text = i;
                    } else {
                        shortName = i;
                        text = "";
                    }

                    //var 

                    var assumption = {
                        board:sev.payload.videowall,
                        name:shortName,
                        css_class:"assumption",
                        text:text
                    }
                    // add to board
                    addElementToBoard(assumption);
                });

                // save data: still testing
                //submitFrontboardAggregatorData(sev);
            },

            videowall_equations_commit: function (sev) {
                _.each(sev.payload.equations, function (i) {
                    var equation = {
                        board:sev.payload.videowall,
                        name:i,
                        css_class:"equation"
                    }


                    // add to board
                    addElementToBoard(equation);
                })
            },

            videowall_problems_commit: function (sev) {
                _.each(sev.payload.problems, function (i) {
                    var problem = {
                        board:sev.payload.videowall,
                        name:i,
                        css_class:"problem"
                    }
                    // add to board
                    addElementToBoard(problem);
                })
            },

            videowall_principles_commit: function (sev) {
                _.each(sev.payload.principles, function (i) {
                    var principle = {
                        board:sev.payload.videowall,
                        name:i,
                        css_class:"principle"
                    }

                    // add to board
                    addElementToBoard(principle);
                })
            }
        }
    };
	
    return self;
})();
