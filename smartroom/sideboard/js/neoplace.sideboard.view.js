/*jshint browser: true, devel: true */
/*globals Sail, jQuery, _, Backbone, Rollcall, NEOplace, MD5 */

(function(app) {
    var view = {};

    // disable the droppable destroy() method to fix
    // droppable behaviour (droppable destroyed after drop)
    // see: http://stackoverflow.com/questions/5020695/jquery-draggable-element-no-longer-draggable-after-drop
    jQuery.ui.draggable.prototype.destroy = function (ul, item) { };

    view.bringDraggableToFront = function () {
        var zs = jQuery('.ui-draggable').map(function() {
            var z = jQuery(this).css('z-index'); 
            return z === 'auto' ? 100 : parseInt(z, 10);
        }).toArray();
        var maxZ = Math.max.apply(Math, zs);
        jQuery(this).css('z-index', maxZ + 1);
    };

    // find or create element in parent matching the selector;
    // if element doesn't exist in parent, create it with the given html
    var foc = function(parent, selector, html) {
        var el = jQuery(parent).find(selector);
        if (el.length) {
            return el;
        } else {
            el = jQuery(html);
            jQuery(parent).append(el);
            return el;
        }
    };

    var generateBalloonElement = function (balloon, view) {
        var jel = jQuery("<div class='balloon' id='"+view.domID()+"'></div>");

        var label = foc(jel, '.label', 
                                "<div class='label'></div>");

        switch(balloon.getType()) {
            case 'principle':
                var principle = balloon.get('principle');
                label.text(principle);
                break;
            case 'problem':
                var pid = balloon.get('problem');
                var problem = app.problems[pid] || ("!!! " + pid + " !!!");
                label.text(problem);
                break;
            case 'equation':
                var eqid = balloon.get('equation');
                var obj = foc(jel, 'obj',
                                '<object class="equation-svg" type="image/svg+xml"></object>');
                if (app.equations[eqid]) {
                    var svg = app.config.assets.url + app.equations[eqid].imgsvg;
                    obj.attr('data', svg);
                    label.append(obj);
                    label.append('<div class="svg-cover"></div>');
                } else {
                    label.text("!!! "+eqid+" !!!");
                }
                break;
            case 'assvar':
                var assvar = balloon.get('assumption') || balloon.get('variable');
                label.text(assvar);
                var subtext = foc(jel, '.subtext',
                                    "<div class='subtext'></div>");
                var subtype = balloon.has('assumption') ? 'assumption' : 'variable';
                subtext.text(subtype);
                jel.addClass('assvar-'+subtype);
                break;
        }

        jel.addClass(balloon.getType())
            .addClass(view.domGrouping());

        return jel[0];
    };

    view.TagBalloonView = Backbone.View.extend({
        initialize: function () {
            this.model.on('change:sorted_as', this.sorted, this);
        },

        render: function () {
            var b = this.model;

            var el = jQuery('#' + this.domID());
            if (el.length) {
                this.setElement(el);
            } else {
                el = generateBalloonElement(b, this);
                this.setElement(el);
                this.$el.data('view', this);

                this.$el.addClass("tag-balloon");

                this.$el.draggable({
                    stop: function (ev, ui) {
                        b.save({pos: ui.position});
                    }
                });

                // BANDAID: For some reason in Chrome draggable() makes balloon's position 'relative'...
                //          Need to reset it back to absolute for proper positioning within the wall.
                this.$el.css('position', 'absolute');

                // bring the balloon to the top when clicked
                this.$el.mousedown(app.bringDraggableToFront);

                this.$el.hide();
                jQuery("#sorting-space").append(this.$el);
                
                if (b.has('pos')) {
                    this.$el.css({
                        left: b.get('pos').left + 'px',
                        top: b.get('pos').top + 'px'
                    });
                } else { 
                    this.autoPosition();
                }

                
                this.$el.addClass('new');

                this.$el.show();
            }

            if (this.model.get('tags').length > 1) {
                var counter = foc(this.$el, '.counter', 
                            "<div class='counter'></div>");

                counter.text(this.model.get('tags').length);

                
                //this.$el.effect('highlight', 'slow');
                counter.effect('highlight', 'slow');
                
            }

            this.sorted();
            
            return this;
        },

        domID: function () {
            return 'tag-'+this.model.id;
        },

        domGrouping: function () {
            return this.model.get('grouping');
        },

        autoPosition: function () {
            var left, top;

            var boardWidth = jQuery("#sorting-space").width();
            var boardHeight = jQuery("#sorting-space").height();
            
            
            left = Math.random() * (boardWidth - this.$el.width());
            top = Math.random() * (boardHeight - this.$el.height());
            
            this.$el.css({
                left: left + 'px',
                top: top + 'px'
            });
            
            this.model.save({pos: {left: left, top: top}});
        },

        sorted: function () {
            switch (this.model.get('sorted_as')) {
                case 'accepted':
                    this.$el
                        .removeClass('sorted-as-rejected')
                        .addClass('sorted-as-accepted');
                    break;
                case 'rejected':
                    this.$el
                        .removeClass('sorted-as-accepted')
                        .addClass('sorted-as-rejected');
                    break;
                default:
                    this.$el.removeClass('sorted-as-accepted sorted-as-rejected');
            }
        }
    });

    view.CommittedBalloonView = Backbone.View.extend({
        render: function () {
            var b = this.model;

            var el = jQuery('#' + this.domID());
            if (el.length) {
                this.setElement(el);
            } else {
                el = generateBalloonElement(b, this);
                this.setElement(el);
                this.$el.data('view', this);

                this.$el.addClass("committed-balloon");

                this.$el.hide();

                jQuery(".committed-box."+b.getType()).append(this.$el);
                
                
                this.$el.addClass('new');

                // fix for firefox; seems to somehow set display: block automatically
                this.$el.show();
            }

            return this;
        },

        domID: function () {
            return 'committed-'+this.model.id;
        },

        domGrouping: function () {
            return this.model.get('grouping');
        }
    });

    view.disableDoneSortingButton = function () {
        jQuery('#done-sorting')
                .addClass('disabled')
                .unbind('click');
    };
    view.toggleDoneSortingButton = function (callWhenDone) {
        var allSorted = jQuery('.tag-balloon')
                            .filter(':not(.sorted-as-accepted)')
                            .filter(':not(.sorted-as-rejected)').length === 0;

        if (jQuery('.tag-balloon').length === 0)
            allSorted = false;

        if (allSorted) {
            jQuery('#done-sorting')
                .removeClass('disabled')
                .unbind('click')
                .bind('click', function () {
                    if (app.state.get('step') === 'problem-sorting') {
                        var instructions = "Please provide a brief rationale for how the problems help in approaching solving the challenge question:";
                        //if (rationale && rationale.length > 0) {
                        //    callWhenDone(rationale);
                        //}
                        view.prompt(instructions, callWhenDone);
                    } else {
                        //if (confirm("Commit your sorted tags?")) {
                            callWhenDone();
                        //}
                    }
                    
                });
        } else {
            view.disableDoneSortingButton();
        }
    };

    view.prompt = function (instructions, callOnSubmit) {
        var dialog = jQuery("<div><p></p><textarea></textarea></div>");
        
        dialog.find('p').text(instructions);
        dialog.find('textarea').css({'width': '100%', 'min-height': '5em'});
        dialog.dialog({
            minWidth: 440,
            modal: true,
            draggable: false,
            buttons: {
                Cancel: function() {
                    jQuery(this).dialog("close");
                },
                Submit: function() {
                    jQuery(this).dialog("close");
                    callOnSubmit(dialog.find('textarea').val());
                }
            }
        });
        dialog.css('width', '400px');
    };

    view.addProblemsRationale = function (rationale) {
        var rationaleContainer = jQuery("<div class='rationale'></div>");
        rationaleContainer.text(rationale);
        jQuery('#problems-committed').append(rationaleContainer);
    };

    view.makeSortingSpaceDroppable = function (callWhenDone) {
        // just in case
        //view.unmakeSortingSpaceDroppable();
        
        if (jQuery('#sorting-space-yup').is('ui-droppable-disabled')) {
            console.log("Making sorting space droppable...");
            jQuery('#sorting-space-yup, #sorting-space-nope').droppable('enable');
        } else if (!jQuery('#sorting-space-yup').is('ui-droppable')) {
            console.log("Making sorting space droppable...");
            jQuery('#sorting-space-yup, #sorting-space-nope').droppable({
                greedy: true,
                over: function (ev, ui) {
                    var balloon = jQuery(ui.draggable);
                    var sortedAs = jQuery(this).data('sorted-as');
                    balloon.data('view').model.set('sorted_as', sortedAs);

                    view.toggleDoneSortingButton(callWhenDone);
                }
            });
        }
        
    };

    view.unmakeSortingSpaceDroppable = function () {
        console.log("Un-making sorting space droppable...");
        jQuery('#sorting-space-yup, #sorting-space-nope').droppable('disable');

        jQuery('#done-sorting').unbind('click');
    };

    view.addCheckedInUser = function (username) {
        var domID = 'user-'+username;
        var u = foc('#users-container', '#'+domID,
                    '<div id="'+domID+'" class="checked-in-user">'+username+'</div>');
        u.show();
    };

    view.removeCheckedInUser = function (username) {
        var domID = 'user-'+username;
        jQuery('#'+domID).hide('fade', 'slow');
    };

    app.view = view;
})(NEOplace.SideBoard);