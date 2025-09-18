document.addEventListener("DOMContentLoaded", function () {
    const urlParams = new URLSearchParams(window.location.search);
    const formType = urlParams.get("form_type");

    let titleText = null;

    if (formType === "custom") {
        titleText = "Add Custom Schedule";
    } else if (formType === "default") {
        titleText = "Add or Update the Default Schedule";
    }

    if (titleText) {
        // Change the browser tab title
        document.title = titleText + " | Django site admin";

        // Change the page <h1>
        const h1 = document.querySelector("div#content h1");
        if (h1) h1.textContent = titleText;
    }
});
