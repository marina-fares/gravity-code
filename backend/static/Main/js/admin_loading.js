document.addEventListener("DOMContentLoaded", function () {
    const overlay = document.getElementById("admin-loading-overlay");
    if (overlay) overlay.style.display = "none";

    window.addEventListener("beforeunload", function () {
        if (overlay) overlay.style.display = "flex";
    });
});
