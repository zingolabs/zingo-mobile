// Files that still hold loose colors. The color lock in eslint.config.js
// skips them; delete a line when its screen moves to tokens (phase 3 of the
// design system migration). Never add one.
module.exports = [
  'app/AppErrorBoundary.tsx',
  'app/LoadedApp/LoadedAppOptionsPanelHost.tsx',
  'app/navigation/CustomTabBar.tsx',
  'app/utils/Utils.ts',
  'screens/Insight/Insight.tsx',
  'screens/Insight/components/ActivityChart.tsx',
  'screens/Insight/components/Donut.tsx',
  'screens/Insight/insightModel.ts',
  'screens/MeetIronwood/MeetIronwood.tsx',
  'screens/MigrationStrategy/components/NymGateSheet.tsx',
  'screens/MigrationTransactions/MigrationTransactions.tsx',
  'screens/OptionsPanel/OptionsPanel.tsx',
  'screens/Pools/Pools.tsx',
  'screens/SyncReport/SyncReport.tsx',
  'screens/ValueTransferDetail/ValueTransferDetail.tsx',
];
