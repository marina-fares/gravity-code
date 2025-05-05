document.addEventListener('DOMContentLoaded', function() {
    const urlParams = new URLSearchParams(window.location.search);
    const formType = urlParams.get('form_type');
    
    if (formType === 'custom') {
        document.title = "Add Custom Session";  // Change the title for the custom form
    } else if (formType === 'new') {
        document.title = "Add New Session";  // Change the title for the new form
    } else {
        document.title = "Add default Session";  // Default title
    }
});
