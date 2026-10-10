# Samsung SDK local dependency

Download Samsung Health Data SDK v1.1.0 from the official Samsung Developer website. Extract its AAR and place it at `app/libs/samsung-health-data-api.aar` in your **local** clone. Do not commit the binary.

Gradle compiles the Samsung native reader when this AAR exists and the Health Connect-only stub otherwise. The Samsung app requires a separate consent prompt and either authorized distribution or developer testing mode. A permanent app signing key is required for reliable upgrades and partnership registration.
