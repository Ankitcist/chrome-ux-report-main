from django.urls import path

from .views import CruxMetricsView

urlpatterns = [
    path("crux/", CruxMetricsView.as_view(), name="crux-metrics"),
]
