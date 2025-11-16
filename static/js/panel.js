document.addEventListener("DOMContentLoaded", function () {

    const tabAlerts = document.getElementById("tab-alerts");
    const tabRoutes = document.getElementById("tab-routes");

    const alertsSection = document.getElementById("alerts-section");
    const routesSection = document.getElementById("routes-section");

    // SHOW ALERTS
    tabAlerts.addEventListener("click", () => {
        tabAlerts.classList.add("active");
        tabRoutes.classList.remove("active");

        alertsSection.style.display = "block";
        routesSection.style.display = "none";
    });

    // SHOW ROUTES
    tabRoutes.addEventListener("click", () => {
        tabRoutes.classList.add("active");
        tabAlerts.classList.remove("active");

        routesSection.style.display = "block";
        alertsSection.style.display = "none";
    });
});
