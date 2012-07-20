/*global module*/
module.exports = function(grunt) { 'use strict';

	// Project configuration.
	grunt.initConfig({
		pkg: '<json:package.json>',
		meta: {
			banner: '/*! <%= pkg.title || pkg.name %> - v<%= pkg.version %> - ' +
				'<%= grunt.template.today("yyyy-mm-dd") %>\n' +
				'<%= pkg.homepage ? "* " + pkg.homepage + "\n" : "" %>' +
				'* Copyright (c) <%= grunt.template.today("yyyy") %> <%= pkg.author.name %>;' +
				' Licensed <%= _.pluck(pkg.licenses, "type").join(", ") %> */'
		},
		shell: {
			docco: {
				command: 'docco'+
				' lib/Observer.js'+
				' test/Observer_test.js',
				stderr: true,
				failOnError: true
			},
			_options: {
				stdout: console.log
			}
		},
		lint: {
			files: ['lib/**/*.js', 'test/**/*.js']
		},
		qunit: {
			files: ['test/Observer.html']
		},
		concat: {
			dist: {
				src: ['<banner>', '<file_strip_banner:lib/<%= pkg.name %>.js>'],
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
		jshint: {
			options: {
				curly: true,
				eqeqeq: true,
				immed: true,
				latedef: true,
				newcap: true,
				noarg: true,
				sub: true,
				undef: true,
				eqnull: true,
				browser: true,
				asi: true,
				// setup global variable sets
				smarttabs:true,
				debug:false,
				// allows me to assign values in funny places
				// e.g. func(var callback = function(){})
				boss: true
			},
			globals: {}
		},
		uglify: {}
	});

	grunt.registerTask('default', 'concat min qunit shell')

};
