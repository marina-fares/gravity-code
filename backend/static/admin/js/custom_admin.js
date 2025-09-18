// static/admin/js/custom_admin.js
document.addEventListener('DOMContentLoaded', function() {
    const button = document.getElementById("newButton");
    if (button) {
      button.addEventListener("click", function() {
        alert("Custom Action Executed!");
        // Here, you could send an AJAX request or redirect.
      });
    }
  });
  