module.exports = function(grunt) {

  // Project configuration.
  grunt.initConfig({

    clean: [
      'artifacts',
      'dest'
    ],

    stru: {
      options: {
        src: 'content',
        dest: 'dest'
      }
    },

    concat_css: {
      options: {},
      all: {
        src: [
          'artifacts/css/normalize.css',
          'artifacts/css/stru.css',
          'artifacts/css/main.css'
        ],
        dest: 'dest/style.css'
      },
    },

  });

  grunt.loadTasks('tasks/stru');

  grunt.loadNpmTasks('grunt-concat-css');
  grunt.loadNpmTasks('grunt-contrib-clean');

  grunt.registerTask('fresh', ['clean', 'default']);
  grunt.registerTask('default', ['stru', 'concat_css']);

};
