/*global module*/
module.exports = function(grunt) { 'use strict';

    // Project configuration.
    grunt.initConfig({
        pkg: '<json:package.json>',
        meta: {
            banner: '// <%= pkg.title || pkg.name %> - v<%= pkg.version %> - ' +
                '<%= grunt.template.today("yyyy-mm-dd") %>\n// ' +
                '<%= pkg.homepage ? pkg.homepage + "\n// " : "" %>' +
                'Copyright (c) <%= grunt.template.today("yyyy") %> <%= pkg.author.name %>;' +
                ' Licensed <%= _.pluck(pkg.licenses, "type").join(", ") %>'
        },
        shell: {
            docco: {
                command: 'docco'+
                ' lib/Observer.js'+
                ' lib/Subscription.js'+
                ' test/Observer_test.js',
                stderr: true,
                failOnError: true
            },
            _options: {
                stdout: console.log
            }
        },
        docco: {
            files: [
                'lib/Observer.js',
                'lib/Subscription.js',
                'test/Observer_test.js'
            ]
        },
        clean: ['dist'],
        requirejs: {
            baseUrl : ".",
            paths : {
                Subscription: 'lib/Subscription',
                Observer: 'lib/Observer'
            },
            include:'Observer',
            out : 'dist/Observer.js',
            optimize : "none"
        },
        qunit: {
            files: ['test/Observer.html']
        },
        concat: {
            dist: {
                src: ['<banner>', '<file_strip_banner:dist/<%= pkg.name %>.js>'],
                dest: 'dist/<%= pkg.name %>.js'
            }
        },
        min: {
            dist: {
                src: ['<banner>', '<config:concat.dist.dest>'],
                dest: 'dist/<%= pkg.name %>.min.js'
            }
        },
        watch: {
            files: '<config:lint.files>',
            tasks: 'lint qunit'
        },
        uglify: {}
    });

    grunt.loadNpmTasks('grunt-contrib');
    grunt.loadNpmTasks('grunt-requirejs');
    grunt.loadNpmTasks('grunt-docco');
    grunt.loadNpmTasks('grunt-shell');
    grunt.registerTask('default', 'clean requirejs concat min shell qunit')

};
