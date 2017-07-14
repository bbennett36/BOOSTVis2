/**
 * Modified by Junlin Liu on 17/3/24.
 */

function ConfidenceLines(container) {
    var that = this;
    that.container = container;

    that.container.style("z-index", 0);

    that.width = confusion_matrix.width;
    that.height = confusion_matrix.height;

    that.container.select("div").remove();
    that.container.select("canvas").remove();

    that.container
        .transition()
        .duration(500)
        .style("opacity", 0);

    that.container.append("div")
        .attr("width", that.width)
        .attr("height", that.height * 0.07)
        .append("text")
        .text("Prediction Score")
        .style("font-size", 11 + "px");

    that.cl_canvas = that.container.append("canvas")
        .attr("width", that.width)
        .attr("height", that.height * 0.93)
        .node();
    that.cl_context = that.cl_canvas.getContext('2d');

    that.cl_canvas.top_gap = 1;
    that.cl_canvas.bottom_gap = 24;
    that.cl_canvas.left_gap = 35;
    that.cl_canvas.right_gap = 10;

    that.cl_canvas.onmousedown = that.canvas_mousedown;
    that.cl_canvas.onmouseout = that.canvas_mouseout;
    that.cl_canvas.onmousemove = that.canvas_mousemove;

    that.T = SEGMENT_COUNT;
    that.partition_count = 10;
    that.posterior = [];
    that.posterior_got = false;
    that.instance_charts = [];

    that.focused_class = null;
    that.focuesd_instance = null;

    that.cluster_label = null;
    that.cluster_id = null;
    that.cluster_label_set = [];
    that.cluster_id_set = [];
    that.cluster_alpha_set = [];

    that.clustering_K = [];
    that.clusters = [];
    that.cluster_final_prob = [];
    that.clustering_res = [];

    that.activated = false;
    that.clusterMode = 1;
    that.instanceMode = 2;
    that.mode = that.clusterMode;
}

ConfidenceLines.prototype.canvas_mouseout = function () {
    var that = confidence_lines;
    that.render_instance_charts(that.focused_class, that.cluster_label, that.cluster_id, that.focused_segment, that.focused_subsegment);
    document.getElementsByTagName("html").item(0).style.cursor = "";
};

ConfidenceLines.prototype.update_cluster_alpha_value = function () {
    var that = this;

    for (var i = 0; i < that.cluster_label_set.length; i++) {
        var flag = 1;
        for (var j = i - 1; j >= 0; j--) {
            if (that.cluster_label_set[j] == that.cluster_label_set[i]) {
                that.cluster_alpha_set[i] = that.cluster_alpha_set[j] * 0.8;
                flag = 0;
                break;
            }
        }
        if (flag == 1) {
            that.cluster_alpha_set[i] = 1.0;
        }
    }
};

ConfidenceLines.prototype.canvas_mousemove = function (e) {
    var loc = windowToCanvas(this, e.clientX, e.clientY);

    e.preventDefault();

    var that = this;

    if (confidence_lines.mode == confidence_lines.clusterMode) {
        var mouseType = "";
        if (loc.x > that.width - that.right_gap) {
            var pos = loc.y - that.top_gap;
            for (var i = 0; i < that.bar_postition.length; i++) {
                var bar_pos = that.bar_postition[i];
                var h = that.half_bar_height;
                if (pos > bar_pos - h && pos < bar_pos + h) {
                    mouseType = "pointer";
                    var cluster_label = confidence_lines.all_final_probs[i]['cluster_label'];
                    var cluster_id = confidence_lines.all_final_probs[i]['cluster_id'];
                    confidence_lines.render_instance_charts(confidence_lines.focused_class, cluster_label, cluster_id, confidence_lines.focused_segment, confidence_lines.focused_subsegment);
                   break;
                }
            }
        }
        else if (loc.x > 0){
            var line = confidence_lines.get_closest_line(loc.x, loc.y, 5);
            if (line != null) {
                mouseType = "pointer";
                var cluster_label = line.k;
                var cluster_id = line.i;
                confidence_lines.render_instance_charts(confidence_lines.focused_class, cluster_label, cluster_id, confidence_lines.focused_segment, confidence_lines.focused_subsegment);
            }
        }
        if (mouseType != "") {
            document.getElementsByTagName("html").item(0).style.cursor=mouseType;
        }
        else {
            document.getElementsByTagName("html").item(0).style.cursor=mouseType;
            confidence_lines.render_instance_charts(confidence_lines.focused_class, -1, -1, confidence_lines.focused_segment, confidence_lines.focused_subsegment);
        }
    }
};


ConfidenceLines.prototype.canvas_mousedown = function (e) {
    var loc = windowToCanvas(this, e.clientX, e.clientY);

    e.preventDefault();

    var that = this;

    if (confidence_lines.mode == confidence_lines.clusterMode) {
        if (loc.x > that.width - that.right_gap) {
            var pos = loc.y - that.top_gap;
            for (var i = 0; i < that.bar_postition.length; i++) {
                var bar_pos = that.bar_postition[i];
                var h = that.half_bar_height;
                if (pos > bar_pos - h && pos < bar_pos + h) {
                    var cluster_label = confidence_lines.all_final_probs[i]['cluster_label'];
                    var cluster_id = confidence_lines.all_final_probs[i]['cluster_id'];

                    confidence_lines.cluster_label = cluster_label;
                    confidence_lines.cluster_id = cluster_id;

                    if (confidence_lines.cluster_label_set.length > 1) {
                        confidence_lines.cluster_label_set = confidence_lines.cluster_label_set.slice(1, 4);
                        confidence_lines.cluster_id_set = confidence_lines.cluster_id_set.slice(1, 4);
                    }

                    confidence_lines.cluster_label_set.push(cluster_label);
                    confidence_lines.cluster_id_set.push(cluster_id);

                    confidence_lines.update_cluster_alpha_value();

                    if (confidence_lines.focused_segment == null) {
                        confidence_lines.focused_segment = 0;
                        confidence_lines.focused_subsegment = 0;
                    }

                    confidence_lines.render_instance_charts(confidence_lines.focused_class, cluster_label, cluster_id, confidence_lines.focused_segment, confidence_lines.focused_subsegment);

                    // on_time_series_cluster_selection_updated(_.map(confidence_lines.cluster_label_set, function (l, i) {
                    //     return [
                    //         confidence_lines.clusters[confidence_lines.cluster_label_set[i]][confidence_lines.cluster_id_set[i]],
                    //         SELECTED_CLASSES[confidence_lines.cluster_label_set[i]]
                    //     ];
                    // }));

                    feature_matrix.render_feature_ranking_for_clusters();
                    break;
                }
            }
        }
        else if (loc.x > 0){
            var line = confidence_lines.get_closest_line(loc.x, loc.y, 5);
            if (line != null) {
                var cluster_label = line.k;
                var cluster_id = line.i;

                var clusterSetSize = confidence_lines.cluster_id_set.length;
                var sameLabelCount = 0;
                for (var i = clusterSetSize - 1;i >= 0;i--) {
                    if (confidence_lines.cluster_label_set[i] == cluster_label) {
                        sameLabelCount++;
                        if(confidence_lines.cluster_id_set[i] == cluster_id) {
                            confidence_lines.cluster_id_set.splice(i, 1);
                            confidence_lines.cluster_label_set.splice(i, 1);
                            if (i == clusterSetSize - 1) {
                                confidence_lines.cluster_label = confidence_lines.cluster_label_set[-1];
                                confidence_lines.cluster_id = confidence_lines.cluster_id_set[-1];
                            }
                            break;
                        }
                        if (sameLabelCount == 2) {
                            confidence_lines.cluster_id_set.splice(i, 1);
                            confidence_lines.cluster_label_set.splice(i, 1);
                            confidence_lines.cluster_label_set.push(cluster_label);
                            confidence_lines.cluster_id_set.push(cluster_id);
                            confidence_lines.cluster_label = cluster_label;
                            confidence_lines.cluster_id = cluster_id;
                            break;
                        }
                    }
                }
                if (i == -1) {
                    confidence_lines.cluster_label_set.push(cluster_label);
                    confidence_lines.cluster_id_set.push(cluster_id);
                    confidence_lines.cluster_label = cluster_label;
                    confidence_lines.cluster_id = cluster_id;
                }
                //tree_inspector.update_cluster_information();



                confidence_lines.update_cluster_alpha_value();

                if (confidence_lines.focused_segment == null) {
                    confidence_lines.focused_segment = 0;
                    confidence_lines.focused_subsegment = 0;
                }

                confidence_lines.render_instance_charts(confidence_lines.focused_class, cluster_label, cluster_id, confidence_lines.focused_segment, confidence_lines.focused_subsegment);

                // on_time_series_cluster_selection_updated(_.map(confidence_lines.cluster_label_set, function (l, i) {
                //     return [
                //         confidence_lines.clusters[confidence_lines.cluster_label_set[i]][confidence_lines.cluster_id_set[i]],
                //         SELECTED_CLASSES[confidence_lines.cluster_label_set[i]]
                //     ];
                // }));


                var alpha = confidence_lines.cluster_alpha_set[confidence_lines.cluster_alpha_set.length - 1];
                //var color = hexToRGB(color_manager.get_color(SELECTED_CLASSES[cluster_label]), alpha);
                var color = (changeColorLightness(color_manager.get_color(SELECTED_CLASSES[cluster_label]), alpha));


                // tree_inspector.plot_cluster(confidence_lines.clusters[confidence_lines.cluster_label][confidence_lines.cluster_id], color);
                // tree_inspector.add_cluster(confidence_lines.clusters[confidence_lines.cluster_label][confidence_lines.cluster_id], SELECTED_CLASSES[cluster_label]);

                feature_matrix.render_feature_ranking_for_clusters();
            }
        }
    }

};

ConfidenceLines.prototype.get_closest_line = function (eventX, eventY, gap) {
    var that = this;
    var T = that.T;

    var canvas_height = that.cl_canvas.height;
    var canvas_width = that.cl_canvas.width;
    var top_gap = that.cl_canvas.top_gap;
    var bottom_gap = that.cl_canvas.bottom_gap;
    var right_gap = that.cl_canvas.right_gap;
    var left_gap = that.cl_canvas.left_gap;
    var clustering_K = that.clustering_K;

    var scale = d3.scale.linear()
    .range([0-0.5,T-0.5])
    .domain([left_gap, canvas_width-right_gap]);

    var X = scale(eventX);
    var minK = 0;
    var minDistance = Infinity;
    var minLine = null;

    if (X >=0) {
        for (var k = 0; k < SELECTED_CLASSES.length; k++) {
            //var centroids = that.clustering_res[k]['centroids'];
            var conf_lines = that.cluster_conf_lines[k];

            for (var i = 0; i < clustering_K[k]; i++) {
                var y1 = (canvas_height - top_gap - bottom_gap) * (1.0 - conf_lines[i][Math.min(parseInt(X), T-1)]) + top_gap;
                var y2 = (canvas_height - top_gap - bottom_gap) * (1.0 - conf_lines[i][Math.min(parseInt(X) + 1, T-1)]) + top_gap;

                var yScale = d3.scale.linear()
                .domain([parseInt(X),parseInt(X) + 1])
                .range([y1,y2]);

                var y = yScale(X);
               if (minDistance > Math.abs(eventY - y)) {
                   minDistance = Math.abs(eventY - y);
                   minLine = {};
                   minLine.k = k;
                   minLine.i = i;
                   minLine.distance = Math.abs(eventY - y);
               }
            }
        }
        if (minLine && (!gap || minLine.distance < gap)) {
            return minLine;
        } else {
            return null;
        }
    }
    return minLine;
};

ConfidenceLines.prototype.get_instance_line_chart = function (focused_class) {
    var that = this;

    that.container
        .style("opacity", 1);

    that.activated = true;
    that.mode = that.clusterMode;
    that.focused_class = focused_class;

    that.get_instance_line_chart_one_class(focused_class);
};

ConfidenceLines.prototype.get_predicted_labels = function () {
    var that = this;
    var T = that.T;

    var predicted_labels = [];
    for (var i = 0; i < INSTANCE_COUNT; i++) {
        var max_value = 0;
        predicted_labels[i] = -1;
        for (var j = 0; j < CLASS_COUNT; j++) {
            var p = that.posterior[(T - 1) * CLASS_COUNT * INSTANCE_COUNT + i * CLASS_COUNT + j];
            if (p > max_value) {
                max_value = p;
                predicted_labels[i] = j;
            }
        }
    }
    that.predicted_labels = predicted_labels;
};


// add by Changjian , 2017/7/13
ConfidenceLines.prototype.get_instance_line_chart_one_class = function (focused_class) {
    var that = this;

    that.cl_canvas.onmousemove = null;
    if (0) {
    } else {
        var loading = add_loading_circle(d3.select("#block-1-4"));
        retrieve_clustering(focused_class, function () {
            that.clustering = CLUSTERING_ALL[focused_class];
            that.clustering_got = true;
            var T = that.T;

            var index = 1;
            var cluster_res = [];
            var clustering_K = [];
            var cluster_conf_lines = [];
            var cluster_final_prob = [];
            var res_index = 0;
            for( index = 1; index < that.clustering.length; ){
                //TODO: Changjian, cannot guarantee this work because select classes function is closed now and i cannot test this.
                if( SELECTED_CLASSES.indexOf(res_index) == -1 ){
                    var clustering_k = that.clustering[index];
                    index = index + clustering_k * T + clustering_k;
                    res_index++;
                }

                cluster_res[res_index] = {};
                cluster_conf_lines[res_index] = [];
                cluster_final_prob[res_index] = [];

                //resolve data from binary file got from beckend
                var clustering_k = that.clustering[index];
                index++;
                var centroids = [];
                var cluster_size = [];
                for( var k = 0; k < clustering_k; k++){
                    centroids[k] = [];
                    cluster_conf_lines[res_index][k] = [];
                    for( var i = 0; i < T; i ++ ){
                        centroids[k][i] = that.clustering[index];
                        cluster_conf_lines[res_index][k][i] = that.clustering[index];
                        if( i == T - 1){
                            cluster_final_prob[res_index][k] = that.clustering[index];
                        }
                        index = index + 1;
                    }
                }
                for( var i = 0; i < clustering_k; i++ ){
                    cluster_size[i] = that.clustering[index];
                    index++;
                }
                cluster_res[res_index]['centroids'] = centroids;
                cluster_res[res_index]['cluster_size'] = cluster_size;
                cluster_res[res_index]['inst_cluster'] = [];

                clustering_K[res_index] = clustering_k;

                res_index++;
            }

            that.clustering_res = cluster_res;
            that.clustering_K = clustering_K;
            that.clusters = [];
            that.cluster_conf_lines = cluster_conf_lines;
            that.cluster_final_prob = cluster_final_prob;

            that.cluster_label = -1;
            that.cluster_id = -1;
            that.cluster_label_set = [];
            that.cluster_id_set = [];
            that.focused_segment = 0;
            that.focused_subsegment = 0;

            //TODO: reset by Changjian
            EXECUTE_CLASSIFIER_CLUSTERING = false;
            if (EXECUTE_CLASSIFIER_CLUSTERING == true) {
                that.perform_advanced_clustering_on_trees(focused_class);
            }

            that.render_instance_charts(focused_class, that.cluster_label, that.cluster_id, -1, -1);
            that.cl_canvas.onmousemove = that.canvas_mousemove;
            remove_loading_circle(d3.select("#block-1-4"));
        });
    }
};

ConfidenceLines.prototype.get_instance_line_chart_one_class_old = function (focused_class) {
    var that = this;

    that.cl_canvas.onmousemove = null;
    if (CONFIDENT_LINES_CLUSTER_RESULT_ALL[focused_class]) {
        var res = CONFIDENT_LINES_CLUSTER_RESULT_ALL[focused_class];
        that.cluster_label = -1;
        that.cluster_id = -1;
        that.cluster_label_set = [];
        that.cluster_id_set = [];
        that.focused_segment = 0;
        that.focused_subsegment = 0;

        that.clustering_res = res["res"];
        that.clustering_K = res["K"];
        that.clusters = res["clusters"];
        that.cluster_conf_lines = res["lines"];
        that.cluster_final_prob = res["prob"];

        if (EXECUTE_CLASSIFIER_CLUSTERING == true) {
            that.perform_advanced_clustering_on_trees(focused_class);
        }

        that.render_instance_charts(focused_class, that.cluster_label, that.cluster_id, -1, -1);
        that.cl_canvas.onmousemove = that.canvas_mousemove;
    } else {
        var loading = add_loading_circle(d3.select("#block-1-4"));
        retrieve_posterior(focused_class, function () {
            that.posterior = POSTERIOR_ALL[focused_class];
            that.posterior_got = true;
            var T = that.T;

            var instance_charts = [];
            for (var i = 0; i < INSTANCE_COUNT; i++) {
                var vec = [];
                for (var t = 0; t < T; t++) {
                    vec[t] = that.posterior[t * INSTANCE_COUNT + i];
                }
                instance_charts[i] = vec;
            }

            that.cluster_label = -1;
            that.cluster_id = -1;
            that.cluster_label_set = [];
            that.cluster_id_set = [];
            that.focused_segment = 0;
            that.focused_subsegment = 0;

            that.instance_charts = instance_charts;
            that.perform_clustering_on_instances(focused_class);

            if (EXECUTE_CLASSIFIER_CLUSTERING == true) {
                that.perform_advanced_clustering_on_trees(focused_class);
            }

            that.render_instance_charts(focused_class, that.cluster_label, that.cluster_id, -1, -1);
            that.cl_canvas.onmousemove = that.canvas_mousemove;
            remove_loading_circle(d3.select("#block-1-4"));
        });
    }
};

ConfidenceLines.prototype.perform_advanced_clustering_on_trees = function (focused_class) {
    var cluster_classifiers = function (tree_dis_vector) {
        CLASSIFIER_CLUSTERING_K = CLASSIFIER_CLUSTER_NUMBER;
        var ADVANCED_CLUSTER_K = CLASSIFIER_CLUSTERING_K, i;

        var res = k_medoids_clustering_flat(tree_dis_vector, ADVANCED_CLUSTER_K);
        var medoids = res["medoids"];
        var cluster_size = res["cluster_size"];
        var cluster_inst_set = res["cluster_inst_set"];

        var cluster_average_index = [];
        for (k = 0; k < ADVANCED_CLUSTER_K; k++) {
            cluster_average_index[k] = sum(cluster_inst_set[k]) / cluster_size[k];
        }
        var cluster_average_tree_size = [];
        var cluster_tree_size_variance = [];
        for (var k = 0; k < ADVANCED_CLUSTER_K; k++) {
            cluster_average_tree_size[k] = 0;
            for (i = 0; i < cluster_size[k]; i++) {
                cluster_average_tree_size[k] += TREE_SIZE[focused_class][cluster_inst_set[k][i]];
            }
            cluster_average_tree_size[k] /= cluster_size[k];

            cluster_tree_size_variance[k] = 0;
            for (i = 0; i < cluster_size[k]; i++) {
                var size = TREE_SIZE[focused_class][cluster_inst_set[k][i]];
                cluster_tree_size_variance[k] += Math.sqrt((size - cluster_average_tree_size[k]) * (size - cluster_average_tree_size[k]));
            }
            cluster_tree_size_variance[k] /= cluster_size[k];
        }
        res['cluster_average_tree_size'] = cluster_average_tree_size.map(function (s) { return s * 2 - 1; });
        res['cluster_tree_size_variance'] = cluster_tree_size_variance.map(function (s) { return s * 2 - 1; });

        var cluster_indices = [];
        for (k = 0; k < ADVANCED_CLUSTER_K; k++) {
            cluster_indices[k] = k;
        }
        cluster_indices = _.sortBy(cluster_indices, function(x){
            return -cluster_average_tree_size[cluster_indices[x]];
        });

        var new_res = {};
        for (var key in res) {
            new_res[key] = [];
            if (key == 'inst_cluster_label') {
                for (i = 0; i < INSTANCE_COUNT; i++) {
                    new_res[key][i] = cluster_indices.indexOf(res[key][i]);
                }
            } else if (key == 'total_dis_sum') {
                new_res[key] = res[key];
            } else {
                for (k = 0; k < ADVANCED_CLUSTER_K; k++) {
                    new_res[key][k] = res[key][cluster_indices[k]];
                }
            }
        }

        for (k = 0; k < ADVANCED_CLUSTER_K; k++) {
            var new_medoid = new_res['medoids'][k];
            var min_dis_sum = Number.MAX_VALUE;
            size = new_res['cluster_size'][k];
            for (i = 0; i < size; i++) {
                var inst_id = new_res['cluster_inst_set'][k][i];
                if (inst_id >= ITERATION_COUNT / ADVANCED_CLUSTER_K * k && inst_id < ITERATION_COUNT / ADVANCED_CLUSTER_K * (k + 1)) {
                    var dis_sum = 0;
                    for (var j = 0; j < size; j++) {
                        var inst_id2 = new_res['cluster_inst_set'][k][j];
                        dis_sum += tree_dis_vector[inst_id][inst_id2];
                    }
                    if (dis_sum < min_dis_sum) {
                        min_dis_sum = dis_sum;
                        new_medoid = inst_id;
                    }
                }
            }
            new_res['medoids'][k] = new_medoid;
        }

        if (DATASET.indexOf("noleaflimit") != -1) {
            new_res['medoids'][0] = 23;
        }
        CLASSIFIER_CLUSTERING_RES_ALL[focused_class][CLASSIFIER_CLUSTER_NUMBER] = new_res;
        CLASSIFIER_CLUSTERING_RES = new_res;
        focus_on_class(focused_class);
    };
    if (CLASSIFIER_CLUSTERING_RES_ALL[focused_class][CLASSIFIER_CLUSTER_NUMBER]) {
        CLASSIFIER_CLUSTERING_RES = CLASSIFIER_CLUSTERING_RES_ALL[focused_class][CLASSIFIER_CLUSTER_NUMBER];
        focus_on_class(focused_class);
    } else {
        cluster_classifiers(CLASSIFIER_DISTANCE_ALL.slice(
            focused_class * ITERATION_COUNT * ITERATION_COUNT,
            (focused_class + 1) * ITERATION_COUNT * ITERATION_COUNT
        ));
    }
};

ConfidenceLines.prototype.perform_clustering_on_instances = function (focused_class) {
    var that = this;
    var T = that.T;

    var classwise_vecs = [], instance_idx = [];
    for (var i = 0; i < SELECTED_CLASSES.length; i++) {
        classwise_vecs[i] = [];
        instance_idx[i] = [];
    }

    for (i = 0; i < INSTANCE_COUNT; i++) {
        if (CLUSTERING_ALL_INSTANCES == false) {
            if (that.predicted_labels[i] != focused_class) { // && TRUE_LABELS[i] != focused_class) {
                continue;
            }
        }

        var index = SELECTED_CLASSES.indexOf(TRUE_LABELS[i]);
        if (index == -1) {
            continue;
        }

        classwise_vecs[index].push(that.instance_charts[i]);
        instance_idx[index].push(i);
    }
    var clustering_K = [];

    for (k = 0; k < SELECTED_CLASSES.length; k++) {
        clustering_K[k] = Math.min(classwise_vecs[k].length, CLUSTERING_K[k]);
        if (CLUSTERING_K[k] == 0) {
            if (classwise_vecs[k].length == 0) {
                clustering_K[k] = 0;
            } else {
                clustering_K[k] = classwise_vecs[k].length <= 50 ? 1 : 2;
            }
        }
    }
    console.log(clustering_K.join(" "), CLUSTERING_K.join(" "));

    var clustering_res = [];
    var clusters = [];
    var cluster_final_prob = [];
    var cluster_conf_lines = [];

    for (var k = 0; k < SELECTED_CLASSES.length; k++) {
        clusters[k] = [];
        cluster_final_prob[k] = [];
        clustering_res[k] = [];
        cluster_conf_lines[k] = [];

        if (clustering_K[k] == 0) {
            continue;
        }

        clustering_res[k] = k_means_clustering(classwise_vecs[k], clustering_K[k]);
        var centroids = clustering_res[k]['centroids'];
        var cluster_size = clustering_res[k]['cluster_size'];
        var inst_cluster = clustering_res[k]['inst_cluster'];

        for (i = 0; i < clustering_K[k]; i++) {
            clusters[k][i] = [];
        }

        for (i = 0; i < classwise_vecs[k].length; i++) {
            clusters[k][inst_cluster[i]].push(instance_idx[k][i]);
        }

        for (i = 0; i < clustering_K[k]; i++) {
            cluster_conf_lines[k][i] = [];
            for (var t = 0; t < T; t++) {
                cluster_conf_lines[k][i][t] = 0;
            }
            for (var j = 0; j < clusters[k][i].length; j++) {
                index = clusters[k][i][j];
                for (t = 0; t < T; t++) {
                    cluster_conf_lines[k][i][t] += that.instance_charts[index][t];
                }
            }
            for (t = 0; t < T; t++) {
                cluster_conf_lines[k][i][t] /= clusters[k][i].length;
            }
        }

        for (i = 0; i < clustering_K[k]; i++) {
            cluster_final_prob[k][i] = cluster_conf_lines[k][i][T - 1];
        }

        console.log('cluster' + k, cluster_size);
    }

    that.clustering_res = clustering_res;
    that.clustering_K = clustering_K;
    that.clusters = clusters;
    that.cluster_conf_lines = cluster_conf_lines;
    that.cluster_final_prob = cluster_final_prob;
    var res = {
        "res": clustering_res,
        "K": clustering_K,
        "clusters": clusters,
        "lines": cluster_conf_lines,
        "prob": cluster_final_prob
    };
    CONFIDENT_LINES_CLUSTER_RESULT_ALL[focused_class] = res;
    return res;
};

ConfidenceLines.prototype.render_line_chart_for_one_instance = function (vector, mousePos) {
    var that = this;

    that.cl_context.clearRect(0, 0, that.cl_canvas.width, that.cl_canvas.height);

    that.draw_line_chart_for_one_instance(vector);

    that.draw_dashed_lines();
    that.draw_horizontal_dashed_lines();
    that.draw_iteration_text();

    feature_matrix.render_feature_ranking_with_one_instance();
};

ConfidenceLines.prototype.render_instance_charts = function (focused_class, cluster_label, cluster_id, mousePos, subSegment) {
    var that = this;
    var T = that.T;

    that.cl_context.clearRect(0, 0, that.cl_canvas.width, that.cl_canvas.height);

    that.draw_vertical_text();
    that.draw_line_charts(cluster_label, cluster_id);
    that.draw_number_bars(cluster_label, cluster_id);

    that.draw_dashed_lines();
    that.draw_horizontal_dashed_lines();
    that.draw_iteration_text();
};

ConfidenceLines.prototype.draw_vertical_text = function () {
    var that = this;

    var canvas_width = that.cl_canvas.width;
    var canvas_height = that.cl_canvas.height;

    that.cl_context.translate(0, canvas_height);
    that.cl_context.rotate(-Math.PI / 2);

    that.cl_context.font = '10px';
    that.cl_context.textAlign = 'center';
    that.cl_context.textBaseline = 'top';
    that.cl_context.fillStyle = 'gray';
    that.cl_context.fillText('Score Value', canvas_height / 2, 2);

    that.cl_context.rotate(Math.PI / 2);
    that.cl_context.translate(0, -canvas_height);
};

ConfidenceLines.prototype.draw_line_chart_for_one_instance = function (vector) {
    var that = this;
    var T = that.T;

    var canvas_height = that.cl_canvas.height;
    var canvas_width = that.cl_canvas.width;
    var top_gap = that.cl_canvas.top_gap;
    var bottom_gap = that.cl_canvas.bottom_gap;
    var right_gap = that.cl_canvas.right_gap;
    var left_gap = that.cl_canvas.left_gap;

    that.cl_context.beginPath();
    that.cl_context.moveTo(left_gap, canvas_height - bottom_gap);

    var xleft, xright, y;
    for (var t = 0; t < T; t++) {
        xleft = (canvas_width - right_gap - left_gap) / T * t + left_gap;
        xright = (canvas_width - right_gap - left_gap) / T * (t + 1) + left_gap;
        y = (canvas_height - top_gap - bottom_gap) * (1.0 - vector[t]) + top_gap;
        that.cl_context.lineTo((xleft + xright) / 2, y);
        that.cl_context.lineWidth = 1.0;
        that.cl_context.strokeStyle = hexToRGB(color_manager.get_color(TRUE_LABELS[that.focused_instance]));
        that.cl_context.stroke();
    }
};

ConfidenceLines.prototype.draw_line_charts = function (cluster_label, cluster_id) {
    var that = this;
    var T = that.T;

    var canvas_height = that.cl_canvas.height;
    var canvas_width = that.cl_canvas.width;
    var top_gap = that.cl_canvas.top_gap;
    var bottom_gap = that.cl_canvas.bottom_gap;
    var right_gap = that.cl_canvas.right_gap;
    var left_gap = that.cl_canvas.left_gap;

    var clustering_K = that.clustering_K;

    for (var k = 0; k < SELECTED_CLASSES.length; k++) {
        if (clustering_K[k] == 0) {
            continue;
        }
        var conf_lines = that.cluster_conf_lines[k];

        for (var i = 0; i < clustering_K[k]; i++) {
            var alpha = 1;

            if (k == cluster_label && i == cluster_id) {
                that.cl_context.lineWidth = 4.0;
            }
            for (var j = 0; j < that.cluster_label_set.length; j++) {
                if (k == that.cluster_label_set[j] && i == that.cluster_id_set[j]) {
                    that.cl_context.lineWidth = 4.0;
                    alpha = that.cluster_alpha_set[j];
                    break;
                }
            }

            that.cl_context.beginPath();
            that.cl_context.moveTo(left_gap, canvas_height - bottom_gap);

            var xleft, xright, y;
            for (var t = 0; t < T; t++) {
                xleft = (canvas_width - right_gap - left_gap) / T * t + left_gap;
                xright = (canvas_width - right_gap - left_gap) / T * (t + 1) + left_gap;
                y = (canvas_height - top_gap - bottom_gap) * (1.0 - conf_lines[i][t]) + top_gap;
                that.cl_context.lineTo((xleft + xright) / 2, y);
            }
            //that.cl_context.strokeStyle = hexToRGB(color_manager.get_color(SELECTED_CLASSES[k]), alpha);
            that.cl_context.strokeStyle = (changeColorLightness(color_manager.get_color(SELECTED_CLASSES[k]), alpha));
            that.cl_context.stroke();

            that.cl_context.lineWidth = 1.0;
        }
    }
};

ConfidenceLines.prototype.draw_highlighted_line_charts = function (cluster_label, cluster_id) {
    var that = this;
    var T = that.T;

    var canvas_height = that.cl_canvas.height;
    var canvas_width = that.cl_canvas.width;
    var top_gap = that.cl_canvas.top_gap;
    var bottom_gap = that.cl_canvas.bottom_gap;
    var right_gap = that.cl_canvas.right_gap;
    var left_gap = that.cl_canvas.left_gap;

    var clustering_K = that.clustering_K;

    for (var k = 0; k < SELECTED_CLASSES.length; k++) {
        if (clustering_K[k] == 0) {
            continue;
        }
        var conf_lines = that.cluster_conf_lines[k];

        for (var i = 0; i < clustering_K[k]; i++) {

            var alpha = 1;

            if (cluster_label && cluster_id && k == cluster_label && i == that.cluster_id) {
                that.cl_context.lineWidth = 4.0;
            }
            else{
                for (var j = 0; j < that.cluster_label_set.length; j++) {
                    if (k == that.cluster_label_set[j] && i == that.cluster_id_set[j]) {
                        that.cl_context.lineWidth = 4.0;
                        alpha = that.cluster_alpha_set[j];
                        break;
                    }
                }
            }

            that.cl_context.beginPath();
            that.cl_context.moveTo(left_gap, canvas_height - bottom_gap);

            var xleft, xright, y;
            for (var t = 0; t < T; t++) {
                xleft = (canvas_width - right_gap - left_gap) / T * t + left_gap;
                xright = (canvas_width - right_gap - left_gap) / T * (t + 1) + left_gap;
                y = (canvas_height - top_gap - bottom_gap) * (1.0 - conf_lines[i][t]) + top_gap;
                that.cl_context.lineTo((xleft + xright) / 2, y);
            }
            that.cl_context.strokeStyle = (changeColorLightness(color_manager.get_color(SELECTED_CLASSES[k]), alpha));
            that.cl_context.stroke();

            that.cl_context.lineWidth = 1.0;
        }
    }
};

ConfidenceLines.prototype.draw_number_bars = function (cluster_label, cluster_id) {
    var that = this;
    var T = that.T;

    var canvas_height = that.cl_canvas.height;
    var canvas_width = that.cl_canvas.width;
    var top_gap = that.cl_canvas.top_gap;
    var bottom_gap = that.cl_canvas.bottom_gap;
    var right_gap = that.cl_canvas.right_gap;
    var left_gap = that.cl_canvas.left_gap;

    var clustering_K = that.clustering_K;

    var all_final_probs = [];

    for (var k = 0; k < SELECTED_CLASSES.length; k++) {
        if (that.clustering_K[k] == 0) {
            continue;
        }

        for (var i = 0; i < clustering_K[k]; i++) {
            all_final_probs.push({
                'cluster_label' : k,
                'cluster_id' : i,
                'cluster_size' : that.clustering_res[k]['cluster_size'][i],
                'final_prob' : that.cluster_final_prob[k][i]
            });
        }
    }

    all_final_probs = _.sortBy(all_final_probs, function (obj) {
        return (-obj['final_prob']);
    });

    that.all_final_probs = all_final_probs;

    var bar_position = [];
    var half_bar_height = 2;
    var max_cluster_size = 0;

    for (i = 0; i < all_final_probs.length; i++) {
        bar_position[i] = Math.round((canvas_height - top_gap - bottom_gap) * (1.0 - all_final_probs[i]['final_prob']));
        if (all_final_probs[i]['cluster_size'] > max_cluster_size) {
            max_cluster_size = all_final_probs[i]['cluster_size'];
        }
    }

    for (i = 1; i < all_final_probs.length; i++) {
        if (bar_position[i] - bar_position[i - 1] < 2 * half_bar_height  && bar_position[i - 1] + 3 * half_bar_height <= (canvas_height - top_gap - bottom_gap)) {
            bar_position[i] = bar_position[i - 1] + 2 * half_bar_height;
        }
    }

    for (i = all_final_probs.length - 2; i >= 0; i--) {
        if (bar_position[i + 1] - bar_position[i] < 2 * half_bar_height) {
            bar_position[i] = bar_position[i + 1] - 2 * half_bar_height;
        }
    }

    that.cl_canvas.bar_postition = bar_position;
    that.cl_canvas.half_bar_height = half_bar_height;

    for (i = 0; i < all_final_probs.length; i++) {
        var bar_width = right_gap * ((Math.pow(all_final_probs[i]['cluster_size'], 0.35) / Math.pow(max_cluster_size, 0.35)) * 0.7 + 0.3);

        var lightness = 1.0;

        for (var j = 0; j < that.cluster_label_set.length; j++) {
            if (all_final_probs[i]['cluster_label'] == that.cluster_label_set[j] && all_final_probs[i]['cluster_id'] == that.cluster_id_set[j]) {
                lightness = that.cluster_alpha_set[j];
                break;
            }
        }

        that.cl_context.fillStyle = (changeColorLightness(color_manager.get_color(SELECTED_CLASSES[all_final_probs[i]['cluster_label']]), lightness));
        that.cl_context.fillRect(canvas_width - right_gap, top_gap + bar_position[i] - half_bar_height, bar_width, half_bar_height * 2);
        that.cl_context.strokeStyle = 'gray';
        that.cl_context.strokeRect(canvas_width - right_gap, top_gap + bar_position[i] - half_bar_height, bar_width, half_bar_height * 2);

        /* connect bars and lines*/
        var xleft = (canvas_width - right_gap - left_gap) / T * (T - 1) + left_gap;
        var xright = (canvas_width - right_gap);
        var original_position = Math.round((canvas_height - top_gap - bottom_gap) * (1.0 - all_final_probs[i]['final_prob']));
        that.cl_context.beginPath();
        that.cl_context.lineWidth = 1.0;
        that.cl_context.moveTo((xleft + xright) / 2, top_gap + original_position);
        that.cl_context.lineTo(xright, top_gap + bar_position[i]);
        that.cl_context.strokeStyle = hexToRGB(color_manager.get_color(SELECTED_CLASSES[all_final_probs[i]['cluster_label']]));
        that.cl_context.stroke();
    }
};


ConfidenceLines.prototype.fill_highlighted_segment = function (mousePos) {
    var that = this;
    var T = that.T;

    var canvas_height = that.cl_canvas.height;
    var canvas_width = that.cl_canvas.width;
    var top_gap = that.cl_canvas.top_gap;
    var bottom_gap = that.cl_canvas.bottom_gap;
    var right_gap = that.cl_canvas.right_gap;
    var left_gap = that.cl_canvas.left_gap;

    if (mousePos !== undefined) {
        var xleft = Math.round((canvas_width - right_gap - left_gap) / T * mousePos + left_gap);
        var xright = Math.round((canvas_width - right_gap - left_gap) / T * (mousePos + 1) + left_gap);
        var ytop = top_gap;
        var ybottom = canvas_height - bottom_gap;

        that.cl_context.fillStyle = hexToRGB('#CCCCCC', 0.6);
        that.cl_context.fillRect(xleft, ytop, xright - xleft, ybottom - ytop);
    }
};

ConfidenceLines.prototype.draw_horizontal_dashed_lines = function () {
    var that = this;

    var canvas_height = that.cl_canvas.height;
    var canvas_width = that.cl_canvas.width;
    var top_gap = that.cl_canvas.top_gap;
    var bottom_gap = that.cl_canvas.bottom_gap;
    var right_gap = that.cl_canvas.right_gap;
    var left_gap = that.cl_canvas.left_gap;

    that.cl_context.setLineDash([2, 3]);
    that.cl_context.strokeStyle = 'gray';

    for (var k = 0; k < that.partition_count + 1; k++) {
        var y = (canvas_height - top_gap - bottom_gap) / that.partition_count * k + top_gap;
        that.cl_context.beginPath();
        that.cl_context.moveTo(left_gap, y);
        that.cl_context.lineTo(canvas_width - right_gap, y);
        that.cl_context.stroke();

        if (k > 0) {
            that.cl_context.textAlign = 'left';
            that.cl_context.textBaseline = 'middle';
            that.cl_context.fillStyle = 'gray';
            that.cl_context.fillText((1.0 - k / 10).toFixed(1), 16, y);
        }
    }

    that.cl_context.setLineDash([]);
};

ConfidenceLines.prototype.draw_dashed_lines = function () {
    var that = this;
    var T = that.T;

    var canvas_width = that.cl_canvas.width;
    var canvas_height = that.cl_canvas.height;
    var top_gap = that.cl_canvas.top_gap;
    var bottom_gap = that.cl_canvas.bottom_gap;
    var right_gap = that.cl_canvas.right_gap;
    var left_gap = that.cl_canvas.left_gap;

    that.cl_context.setLineDash([2, 3]);
    that.cl_context.strokeStyle = 'gray';

    for (var t = 0; t < T; t++) {
        var xleft = Math.round((canvas_width - right_gap - left_gap) / T * t + left_gap);
        var xright = Math.round((canvas_width - right_gap - left_gap) / T * (t + 1) + left_gap);

        that.cl_context.beginPath();
        that.cl_context.moveTo((xleft + xright) / 2, top_gap);
        that.cl_context.lineTo((xleft + xright) / 2, canvas_height - bottom_gap);
        that.cl_context.stroke();
    }
    that.cl_context.setLineDash([]);
};

ConfidenceLines.prototype.draw_iteration_text = function () {
    var that = this;
    var T = that.T;

    var canvas_width = that.cl_canvas.width;
    var canvas_height = that.cl_canvas.height;
    var bottom_gap = that.cl_canvas.bottom_gap;
    var right_gap = that.cl_canvas.right_gap;
    var left_gap = that.cl_canvas.left_gap;

    that.cl_context.font = '10px';
    that.cl_context.textAlign = 'center';
    that.cl_context.textBaseline = 'top';
    that.cl_context.fillStyle = 'gray';
    that.cl_context.fillText('Number of Iteration', canvas_width / 2, canvas_height - 13);

    for (var t = 0; t < T; t++) {
        var xleft = Math.round((canvas_width - right_gap - left_gap) / T * t + left_gap);
        var xright = Math.round((canvas_width - right_gap - left_gap) / T * (t + 1) + left_gap);
        that.cl_context.fillText(ENDPOINTS[t] + 1, (xleft + xright) / 2, canvas_height - bottom_gap + 1);
    }
};

function k_medoids_clustering_flat (vector, K) {
    var N = Math.sqrt(vector.length);

    if (K > N) {
        console.log("The number of clusters is too large.");
        return null;
    }

    var medoids = [];
    for (var k = 0; k < K; k++) {
        medoids[k] = Math.round(N / K * k);
    }

    var inst_cluster_label = [];
    var cluster_inst_set = [];
    var cluster_size = [];
    var total_dis_sum;

    var iteration_count = 10;

    for (var ite_cnt = 0; ite_cnt < iteration_count; ite_cnt++) {
        for (k = 0; k < K; k++) {
            cluster_inst_set[k] = [];
            cluster_size[k] = 0;
        }

        for (var i = 0; i < N; i++) {
            var min_dis = Number.MAX_VALUE;
            for (k = 0; k < K; k++) {
                if (vector[i * N + medoids[k]] < min_dis) {
                    min_dis = vector[i * N + medoids[k]];
                    inst_cluster_label[i] = k;
                }
            }
            cluster_inst_set[inst_cluster_label[i]].push(i);
            cluster_size[inst_cluster_label[i]]++;
        }

        total_dis_sum = 0;
        for (k = 0; k < K; k++) {
            var min_dis_sum = Number.MAX_VALUE;
            for (i = 0; i < cluster_inst_set[k].length; i++) {
                var dis_sum = 0;
                for (var j = 0; j < cluster_inst_set[k].length; j++) {
                    if (i != j) {
                        dis_sum += vector[cluster_inst_set[k][i] * N + cluster_inst_set[k][j]];
                    }
                }
                if (dis_sum < min_dis_sum) {
                    min_dis_sum = dis_sum;
                    medoids[k] = cluster_inst_set[k][i];
                }
            }
            total_dis_sum += min_dis_sum;
        }
    }

    return {
        'medoids' : medoids,
        'cluster_size' : cluster_size,
        'cluster_inst_set' : cluster_inst_set,
        'inst_cluster_label' : inst_cluster_label,
        'total_dis_sum' : total_dis_sum
    };
}

function k_medoids_clustering (dismat, K) {
    var N = dismat.length;

    if (K > N) {
        console.log("The number of clusters is too large.");
        return null;
    }

    var medoids = [];
    for (var k = 0; k < K; k++) {
        medoids[k] = Math.round(N / K * k);
    }

    var inst_cluster_label = [];
    var cluster_inst_set = [];
    var cluster_size = [];
    var total_dis_sum;

    var iteration_count = 10;

    for (var ite_cnt = 0; ite_cnt < iteration_count; ite_cnt++) {
        for (k = 0; k < K; k++) {
            cluster_inst_set[k] = [];
            cluster_size[k] = 0;
        }

        for (var i = 0; i < N; i++) {
            var min_dis = Number.MAX_VALUE;
            for (k = 0; k < K; k++) {
                if (dismat[i][medoids[k]] < min_dis) {
                    min_dis = dismat[i][medoids[k]];
                    inst_cluster_label[i] = k;
                }
            }
            cluster_inst_set[inst_cluster_label[i]].push(i);
            cluster_size[inst_cluster_label[i]]++;
        }

        total_dis_sum = 0;
        for (k = 0; k < K; k++) {
            var min_dis_sum = Number.MAX_VALUE;
            for (i = 0; i < cluster_inst_set[k].length; i++) {
                var dis_sum = 0;
                for (var j = 0; j < cluster_inst_set[k].length; j++) {
                    if (i != j) {
                        dis_sum += dismat[cluster_inst_set[k][i]][cluster_inst_set[k][j]];
                    }
                }
                if (dis_sum < min_dis_sum) {
                    min_dis_sum = dis_sum;
                    medoids[k] = cluster_inst_set[k][i];
                }
            }
            total_dis_sum += min_dis_sum;
        }
    }

    return {
        'medoids' : medoids,
        'cluster_size' : cluster_size,
        'cluster_inst_set' : cluster_inst_set,
        'inst_cluster_label' : inst_cluster_label,
        'total_dis_sum' : total_dis_sum
    };
}

function k_means_clustering (vectors, K) {
    var N = vectors.length;

    if (K > N) {
        console.log("The number of clusters is not sufficient.");
        return {};
    }

    var M = vectors[0].length;
    var centroids = [];

    for (var k = 0; k < K; k++) {
        centroids[k] = [];
        var j = Math.floor(N / K * k);
        //var j = Math.floor(f_random() * N);
        for (var i = 0; i < M; i++) {
            centroids[k][i] = vectors[j][i];
        }
    }

    var iteration_count = 50;

    var inst_cluster = [];
    for (var ite_cnt = 0; ite_cnt < iteration_count; ite_cnt++) {
        for (i = 0; i < N; i++) {
            var min_dis = Number.MAX_VALUE;
            for (k = 0; k < K; k++) {
                var dis = vector_distance(vectors[i], centroids[k]);
                if (dis < min_dis) {
                    min_dis = dis;
                    inst_cluster[i] = k;
                }
            }
        }

        var inst_count = [];
        for (k = 0; k < K; k++) {
            centroids[k] = [];
            inst_count[k] = 0;
            for (j = 0; j < M; j++) {
                centroids[k][j] = 0;
            }
        }

        for (i = 0; i < N; i++) {
            k = inst_cluster[i];
            for (j = 0; j < M; j++) {
                centroids[k][j] += vectors[i][j];
            }
            inst_count[k]++;
        }

        for (k = 0; k < K; k++) {
            for (j = 0; j < M; j++) {
                centroids[k][j] /= inst_count[k];
            }
        }
    }

    return {
        'centroids' : centroids,
        'cluster_size' : inst_count,
        'inst_cluster' : inst_cluster
    };
}

function vector_distance (u, v) {
    if (u.length != v.length) {
        console.log("Vectors have different lengths.");
        return 0;
    }

    var dis = 0;
    for (var i = 0; i < u.length; i++) {
        dis += (u[i] - v[i]) * (u[i] - v[i]);
    }

    return Math.sqrt(dis);
}

function parse_single_classifier(data) {
    var lines = data.split('\n');

    var tree = {};

    for (var l = 0; l < lines.length; l++) {
        var str = lines[l];
        if (str.startsWith('Tree') == true) {

            tree['internal_parent'] = [];

            while (true) {
                l++;
                str = lines[l];
                if (str.includes('=') == false) {
                    break;
                }
                if (l >= lines.length) {
                    break;
                }

                var partition = str.split('=');
                var node_info = partition[1].split(' ');

                if (str.startsWith('num_leaves') == true) {
                    tree['num_leaves'] = parseInt(partition[1]);
                    tree['num_internals'] = tree['num_leaves'] - 1;
                } else if (str.startsWith('split_feature') == true) {
                    tree['split_feature'] = [];
                    for (var i = 0; i < tree['num_internals']; i++) {
                        tree['split_feature'].push(parseInt(node_info[i]));
                    }
                } else if (str.startsWith('split_gain') == true) {
                    tree['split_gain'] = [];
                    for (i = 0; i < tree['num_internals']; i++) {
                        tree['split_gain'].push(parseFloat(node_info[i]));
                    }
                } else if (str.startsWith('threshold') == true) {
                    tree['threshold'] = [];
                    for (i = 0; i < tree['num_internals']; i++) {
                        tree['threshold'].push(parseFloat(node_info[i]));
                    }
                } else if (str.startsWith('left_child') == true) {
                    tree['left_child'] = [];
                    for (i = 0; i < tree['num_internals']; i++) {
                        var p = parseInt(node_info[i]);
                        tree['left_child'].push(p);
                        if (p >= 0) {
                            tree['internal_parent'][p] = i;
                        }
                    }
                } else if (str.startsWith('right_child') == true) {
                    tree['right_child'] = [];
                    for (i = 0; i < tree['num_internals']; i++) {
                        p = parseInt(node_info[i]);
                        tree['right_child'].push(p);
                        if (p >= 0) {
                            tree['internal_parent'][p] = i;
                        }
                    }
                } else if (str.startsWith('leaf_parent') == true) {
                    tree['leaf_parent'] = [];
                    for (i = 0; i < tree['num_leaves']; i++) {
                        tree['leaf_parent'].push(parseInt(node_info[i]));
                    }
                } else if (str.startsWith('leaf_value') == true) {
                    tree['leaf_value'] = [];
                    for (i = 0; i < tree['num_leaves']; i++) {
                        tree['leaf_value'].push(parseFloat(node_info[i]))
                    }
                } else if (str.startsWith('leaf_count') == true) {
                    tree['leaf_count'] = [];
                    for (i = 0; i < tree['num_leaves']; i++) {
                        tree['leaf_count'].push(parseInt(node_info[i]));
                    }
                } else if (str.startsWith('internal_values') == true) {
                    tree['internal_value'] = [];
                    for (i = 0; i < tree['num_internals']; i++) {
                        tree['internal_value'].push(parseFloat(node_info[i]));
                    }
                } else if (str.startsWith('internal_count') == true) {
                    tree['internal_count'] = [];
                    for (i = 0; i < tree['num_internals']; i++) {
                        tree['internal_count'].push(parseInt(node_info[i]));
                    }
                }
            }
        }
    }

    return tree;
}

function calculate_instance_count_on_nodes(iteration, class_label, inst_idx) {
    var inst_count_on_leaves = [],
        inst_count_on_internals = [];

    for (i = 0; i < TREE_INFO_LIGHTGBM[iteration][class_label]['num_leaves'] + 1; i++) {
        inst_count_on_leaves[i] = 0;
    }

    for (i = 0; i < TREE_INFO_LIGHTGBM[iteration][class_label]['num_internals']; i++) {
        inst_count_on_internals[i] = 0;
    }

    for (var i = 0; i < inst_idx.length; i++) {
        var feature_vector = RAW_FEATURES[inst_idx[i]];
        var node_id = 0;

        while (true) {
            inst_count_on_internals[node_id]++;

            var split_feature = TREE_INFO_LIGHTGBM[iteration][class_label]['split_feature'][node_id];
            var threshold = TREE_INFO_LIGHTGBM[iteration][class_label]['threshold'][node_id];

            if (feature_vector[split_feature] < threshold) {
                node_id = TREE_INFO_LIGHTGBM[iteration][class_label]['left_child'][node_id];
            } else {
                node_id = TREE_INFO_LIGHTGBM[iteration][class_label]['right_child'][node_id];
            }

            if (node_id < 0) {
                break;
            }
        }

        inst_count_on_leaves[-node_id]++;
    }

    return {
        'inst_count_on_leaves' : inst_count_on_leaves,
        'inst_count_on_internals' : inst_count_on_internals
    };
}



ConfidenceLines.prototype.perform_clustering_on_trees = function (focused_class) {

    var tree_vectors = [];
    for (var t = 0; t < ITERATION_COUNT; t++) {
        var positive_set = [];
        var negative_set = [];
        for (i = 0; i < INSTANCE_COUNT; i++) {
            if (TRUE_LABELS[i] == focused_class) {
                positive_set.push(i);
            } else {
                negative_set.push(i);
            }
        }
        var inst_count = calculate_instance_count_on_nodes(t, focused_class, positive_set);
        var inst_count_on_leaves = inst_count['inst_count_on_leaves'];
        inst_count_on_leaves = _.sortBy(inst_count_on_leaves, function (ele) {
            return -ele;
        });

        var vector = [];
        for (var i = 0; i < 10; i++) {
            vector[i * 2] = inst_count_on_leaves[i] / positive_set.length;
        }

        inst_count = calculate_instance_count_on_nodes(t, focused_class, negative_set);
        inst_count_on_leaves = inst_count['inst_count_on_leaves'];
        inst_count_on_leaves = _.sortBy(inst_count_on_leaves, function (ele) {
            return -ele;
        });

        for (i = 0; i < 10; i++) {
            vector[i * 2 + 1] = inst_count_on_leaves[i] / negative_set.length;
        }

        tree_vectors[t] = vector;
    }

    //console.log(tree_vectors);

    var K = 10;
    var res = k_means_clustering(tree_vectors, K);
    var centroids = res['centroids'];
    var cluster_size = res['cluster_size'];
    var inst_cluster = res['inst_cluster'];

    for (i = 0; i < K; i++) {
        console.log('centroid : ' + i, centroids[i]);

        var instance_collection = [];
        for (var j = 0; j < INSTANCE_COUNT; j++) {
            if (inst_cluster[j] == i) {
                instance_collection.push(j);
            }
        }

        console.log('inst collection : ' + i, instance_collection);
    }
};

ConfidenceLines.prototype.render_leaf_glyph_for_one_instance = function () {
    var that = this;
    var T = that.T;

    that.cl_context.clearRect(0, that.cl_canvas.height - that.cl_canvas.bottom_gap + 2, that.cl_canvas.width, that.cl_canvas.bottom_gap - 2);

    for (var t = 0; t < T; t++) {
        var start = (t == 0) ? 0 : ENDPOINTS[t - 1] + 1;
        var end = ENDPOINTS[t];
        var inst_count_on_pos_leaves = 0;
        var inst_count_on_neg_leaves = 0;

        for (var i = start; i <= end; i++) {
            var res = calculate_instance_count_on_nodes(i, that.focused_class, [that.focused_instance]);
            var inst_count_on_leaves = res['inst_count_on_leaves'];

            for (var j = 1; j < inst_count_on_leaves.length; j++) {
                if (TREE_INFO_LIGHTGBM[i][that.focused_class]['leaf_value'][j - 1] > 0) {
                    inst_count_on_pos_leaves += inst_count_on_leaves[j];
                } else {
                    inst_count_on_neg_leaves += inst_count_on_leaves[j];
                }
            }
        }

        var ratio = inst_count_on_neg_leaves / (inst_count_on_neg_leaves + inst_count_on_pos_leaves);

        var xl = (that.cl_canvas.width - that.cl_canvas.right_gap) / T * t + 3;
        var xr = (that.cl_canvas.width - that.cl_canvas.right_gap) / T * (t + 1) - 3;
        var ymid = that.cl_canvas.top_gap - 5;

        var region = {
            'xl' : xl,
            'xr' : xr,
            'ymid' : ymid
        };

        that.draw_single_leaf_value_glyph(TRUE_LABELS[that.focuesd_instance], region, ratio);
    }

    if (that.focused_segment != undefined) {
        var segment = that.focused_segment;
        start = (segment == 0) ? 0 : ENDPOINTS[segment - 1] + 1;
        end = ENDPOINTS[segment];

        for (t = start; t <= end; t++) {
            res = calculate_instance_count_on_nodes(t, that.focused_class, [that.focused_instance]);
            inst_count_on_leaves = res['inst_count_on_leaves'];
            inst_count_on_pos_leaves = 0;
            inst_count_on_neg_leaves = 0;

            for (j = 1; j < inst_count_on_leaves.length; j++) {
                if (TREE_INFO_LIGHTGBM[t][that.focused_class]['leaf_value'][j - 1] > 0) {
                    inst_count_on_pos_leaves += inst_count_on_leaves[j];
                } else {
                    inst_count_on_neg_leaves += inst_count_on_leaves[j];
                }
            }

            ratio = inst_count_on_neg_leaves / (inst_count_on_neg_leaves + inst_count_on_pos_leaves);

            xl = (that.cl_canvas.width - that.cl_canvas.right_gap) / T * (t - start) + 3;
            xr = (that.cl_canvas.width - that.cl_canvas.right_gap) / T * (t - start + 1) - 3;
            ymid = that.cl_canvas.height - 5;

            region = {
                'xl' : xl,
                'xr' : xr,
                'ymid' : ymid
            };

            that.draw_single_leaf_value_glyph(TRUE_LABELS[that.focused_instance], region, ratio);

            that.cl_context.textAlign = 'center';
            that.cl_context.textBaseline = 'top';
            that.cl_context.fillStyle = 'gray';
            that.cl_context.fillText(t + 1, (xl + xr) / 2, that.cl_canvas.height - that.cl_canvas.bottom_gap + 2);

            if (t - start == that.focused_subsegment) {
                that.cl_context.fillStyle = hexToRGB('#CCCCCC', 0.6);
                that.cl_context.fillRect(xl - 2, that.cl_canvas.height - that.cl_canvas.bottom_gap + 2, xr - xl + 4, that.cl_canvas.bottom_gap - 2);
            }
        }
    }
};

ConfidenceLines.prototype.render_leaf_value_glyphs = function (focused_class) {
    var that = this;
    var T = that.T;

    that.cl_context.clearRect(0, that.cl_canvas.height - that.cl_canvas.bottom_gap + 2, that.cl_canvas.width, that.cl_canvas.bottom_gap - 2);

    var cluster = that.clusters[that.cluster_label][that.cluster_id];

    for (var t = 0; t < T; t++) {
        var start = (t == 0) ? 0 : ENDPOINTS[t - 1] + 1;
        var end = ENDPOINTS[t];
        var inst_count_on_pos_leaves = 0;
        var inst_count_on_neg_leaves = 0;

        for (var i = start; i <= end; i++) {
            var res = calculate_instance_count_on_nodes(i, focused_class, cluster);
            var inst_count_on_leaves = res['inst_count_on_leaves'];

            for (var j = 1; j < inst_count_on_leaves.length; j++) {
                if (TREE_INFO_LIGHTGBM[i][focused_class]['leaf_value'][j - 1] > 0) {
                    inst_count_on_pos_leaves += inst_count_on_leaves[j];
                } else {
                    inst_count_on_neg_leaves += inst_count_on_leaves[j];
                }
            }
        }

        var ratio = inst_count_on_neg_leaves / (inst_count_on_neg_leaves + inst_count_on_pos_leaves);

        var xl = (that.cl_canvas.width - that.cl_canvas.right_gap) / T * t + 3;
        var xr = (that.cl_canvas.width - that.cl_canvas.right_gap) / T * (t + 1) - 3;
        var ymid = that.cl_canvas.top_gap - 5;

        var region = {
            'xl' : xl,
            'xr' : xr,
            'ymid' : ymid
        };

        that.draw_single_leaf_value_glyph(SELECTED_CLASSES[that.cluster_label], region, ratio);
    }

    if (that.focused_segment != undefined) {
        var segment = that.focused_segment;
        start = (segment == 0) ? 0 : ENDPOINTS[segment - 1] + 1;
        end = ENDPOINTS[segment];

        for (t = start; t <= end; t++) {
            res = calculate_instance_count_on_nodes(t, focused_class, cluster);
            inst_count_on_leaves = res['inst_count_on_leaves'];
            inst_count_on_pos_leaves = 0;
            inst_count_on_neg_leaves = 0;

            for (j = 1; j < inst_count_on_leaves.length; j++) {
                if (TREE_INFO_LIGHTGBM[t][focused_class]['leaf_value'][j - 1] > 0) {
                    inst_count_on_pos_leaves += inst_count_on_leaves[j];
                } else {
                    inst_count_on_neg_leaves += inst_count_on_leaves[j];
                }
            }

            ratio = inst_count_on_neg_leaves / (inst_count_on_neg_leaves + inst_count_on_pos_leaves);

            xl = (that.cl_canvas.width - that.cl_canvas.right_gap) / T * (t - start) + 3;
            xr = (that.cl_canvas.width - that.cl_canvas.right_gap) / T * (t - start + 1) - 3;
            ymid = that.cl_canvas.height - 5;

            region = {
                'xl' : xl,
                'xr' : xr,
                'ymid' : ymid
            };

            that.draw_single_leaf_value_glyph(SELECTED_CLASSES[that.cluster_label], region, ratio);

            that.cl_context.textAlign = 'center';
            that.cl_context.textBaseline = 'top';
            that.cl_context.fillStyle = 'gray';
            that.cl_context.fillText(t + 1, (xl + xr) / 2, that.cl_canvas.height - that.cl_canvas.bottom_gap + 2);

            if (t - start == that.focused_subsegment) {
                that.cl_context.fillStyle = hexToRGB('#CCCCCC', 0.6);
                that.cl_context.fillRect(xl - 2, that.cl_canvas.height - that.cl_canvas.bottom_gap + 2, xr - xl + 4, that.cl_canvas.bottom_gap - 2);
            }
        }
    }
};

ConfidenceLines.prototype.draw_single_leaf_value_glyph = function (class_label, region, ratio) {
    var that = this;

    that.cl_context.lineWidth = 2.0;
    //that.cl_context.strokeStyle = hexToRGB(color_manager.get_color(SELECTED_CLASSES[cluster_label] ));
    that.cl_context.strokeStyle = hexToRGB(color_manager.get_color(class_label));
    that.cl_context.beginPath();
    that.cl_context.moveTo(region['xl'], region['ymid']);
    that.cl_context.lineTo(region['xr'], region['ymid']);
    that.cl_context.stroke();

    var xmid = region['xl'] + (region['xr'] - region['xl']) * ratio;
    that.cl_context.beginPath();
    that.cl_context.moveTo(xmid, region['ymid'] - 3);
    that.cl_context.lineTo(xmid, region['ymid'] + 3);
    that.cl_context.strokeStyle = 'gray';
    that.cl_context.stroke();
};

ConfidenceLines.prototype.render_path_distribution_glyphs = function (focused_class, cluster_label, cluster_id, segment, sub_segment) {
    var that = this;
    var T = that.T;

    that.cl_context.clearRect(0, that.cl_canvas.height - that.cl_canvas.bottom_gap + 2, that.cl_canvas.width, that.cl_canvas.bottom_gap - 2);

    var cluster = that.clusters[cluster_label][cluster_id];

    for (var t = 0; t < T; t++) {
        var start = (t == 0) ? 0 : ENDPOINTS[t - 1] + 1;
        var end = ENDPOINTS[t];
        var inst_count_sum = [];

        for (var i = start; i <= end; i++) {
            res = calculate_instance_count_on_nodes(i, focused_class, cluster);
            var inst_count_on_leaves = res['inst_count_on_leaves'];
            var sorted_count = _.sortBy(inst_count_on_leaves, function(num){return -num;});

            if (sorted_count.length <= inst_count_sum.length) {
                for (var k = 0; k < sorted_count.length; k++) {
                    inst_count_sum[k] += sorted_count[k];
                }
            } else {
                for (k = 0; k < inst_count_sum.length; k++) {
                    inst_count_sum[k] += sorted_count[k];
                }
                for (k = inst_count_sum.length; k < sorted_count.length; k++) {
                    inst_count_sum[k] = sorted_count[k];
                }
            }
        }

        var xl = (that.cl_canvas.width - that.cl_canvas.right_gap) / T * t + 2;
        var xr = (that.cl_canvas.width - that.cl_canvas.right_gap) / T * (t + 1) - 2;
        var yb = that.cl_canvas.top_gap - 5;
        var yt = yb - 10;

        var region = {
            'xl' : xl, 'xr' : xr, 'yt' : yt, 'yb' : yb
        };

        that.draw_single_path_glyph(cluster_label, region, inst_count_sum);
    }

    if (segment != null) {
        start = (segment == 0) ? 0 : ENDPOINTS[segment - 1] + 1;
        end = ENDPOINTS[segment];

        for (t = start; t <= end; t++) {
            var res = calculate_instance_count_on_nodes(t, focused_class, cluster);
            inst_count_on_leaves = res['inst_count_on_leaves'];

            xl = (that.cl_canvas.width - that.cl_canvas.right_gap) / T * (t - start) + 2;
            xr = (that.cl_canvas.width - that.cl_canvas.right_gap) / T * (t - start + 1) - 2;
            yb = that.cl_canvas.height - 5;
            yt = yb - 10;

            region = {
                'xl' : xl, 'xr' : xr, 'yt' : yt, 'yb' : yb
            };

            that.draw_single_path_glyph(cluster_label, region, inst_count_on_leaves);

            that.cl_context.textAlign = 'center';
            that.cl_context.textBaseline = 'middle';
            that.cl_context.fillStyle = 'gray';
            that.cl_context.fillText(t + 1, (xl + xr) / 2, (that.cl_canvas.height - that.cl_canvas.bottom_gap + yt) / 2);

            if (t - start == sub_segment) {
                that.cl_context.fillStyle = hexToRGB('#CCCCCC', 0.6);
                that.cl_context.fillRect(xl - 2, that.cl_canvas.height - that.cl_canvas.bottom_gap + 2, xr - xl + 4, that.cl_canvas.bottom_gap - 2);
            }
        }
    }
};

ConfidenceLines.prototype.draw_single_path_glyph = function (cluster_label, region, inst_count_on_leaves) {
    var that = this;

    var sorted_count = _.sortBy(inst_count_on_leaves, function (num) {return -num;});
    var count_sum = sum(inst_count_on_leaves);
    var xl = region['xl'], xr = region['xr'], yt = region['yt'], yb = region['yb'];
    var dir = 0, alpha = 1.0;

    that.cl_context.strokeStyle = 'gray';
    that.cl_context.strokeRect(xl, yt, xr - xl, yb - yt);

    for (var i = 0; i < 5; i++) {
        var count = sorted_count[i];
        var ratio = count / count_sum;
        //console.log(count, ratio);
        if (dir == 0) {
            var xmid = xl + (xr - xl) * ratio;
            that.cl_context.fillStyle = hexToRGB(color_manager.get_color(SELECTED_CLASSES[cluster_label]), alpha);
            that.cl_context.fillRect(xl, yt, xmid - xl, yb - yt);
            xl = xmid;
            dir = 1;
        } else {
            var ymid = yt + (yb - yt) * ratio;
            that.cl_context.fillStyle = hexToRGB(color_manager.get_color(SELECTED_CLASSES[cluster_label]), alpha);
            that.cl_context.fillRect(xl, yt, xr - xl, ymid - yt);
            yt = ymid;
            dir = 0;
        }
        count_sum -= count;
        alpha -= 0.15;
    }
};

ConfidenceLines.prototype.print_debugging_information_root_features = function (focused_class) {
    var that = this;

    var root_feature_count = [];
    for (var i = 0; i < FEATURE_COUNT; i++) {
        root_feature_count[i] = 0;
    }

    for (var t = 0; t < ITERATION_COUNT; t++) {
        var feature_id = TREE_INFO_LIGHTGBM[t][focused_class]['split_feature'][0];
        root_feature_count[feature_id]++;
    }

    var root_feature_info = [];
    for (i = 0; i < FEATURE_COUNT; i++) {
        root_feature_info[i] = {
            'feature_id' : i,
            'count' : root_feature_count[i]
        };
    }
    root_feature_info = _.sortBy(root_feature_info, function (obj) {
        return -obj['count'];
    });

    for (i = 0; i < FEATURE_COUNT; i++) {
        console.log(root_feature_info[i]['feature_id'], root_feature_info[i]['count']);
    }
};

ConfidenceLines.prototype.debugging_print_node_gain_or_size_ranking = function (focused_class) {
    var that = this;

    var info = [];
    var nodes;
    for (var t = 0; t < ITERATION_COUNT; t++) {
        var num_internals = TREE_INFO_LIGHTGBM[t][focused_class]['num_internals'];

        nodes = [];

        for (var i = 0; i < num_internals; i++) {
            nodes[i] = {
                'split_gain' : TREE_INFO_LIGHTGBM[t][focused_class]['split_gain'][i],
                'internal_count' : TREE_INFO_LIGHTGBM[t][focused_class]['internal_count'][i],
                'id' : i
            };
        }

        var nodes_by_gain = _.sortBy(nodes, function(obj){return -obj['split_gain']});
        var nodes_by_count = _.sortBy(nodes, function(obj){return -obj['internal_count']});

        nodes_by_gain.splice(20);
        nodes_by_count.splice(20);

        info[t] = {
            'iteration' : t,
            'num_internals' : num_internals,
            'nodes_by_gain' : nodes_by_gain,
            'nodes_by_count' : nodes_by_count
        };
    }
};
