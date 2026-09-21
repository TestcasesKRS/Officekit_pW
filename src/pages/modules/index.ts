import { Page } from '@playwright/test';
import { ApplicationModulePage } from './ApplicationModulePage';

export { LoginPage } from '../LoginPage';
export { DashboardPage } from '../DashboardPage';
export { ApplicationModulePage } from './ApplicationModulePage';

export class EmployeeManagementPage extends ApplicationModulePage {
  constructor(page: Page) {
    super(page, 'Company');
  }
}

export class AttendancePage extends ApplicationModulePage {
  constructor(page: Page) {
    super(page, 'Attendance');
  }
}

export class LeaveManagementPage extends ApplicationModulePage {
  constructor(page: Page) {
    super(page, 'Leave');
  }
}

export class ShiftManagementPage extends ApplicationModulePage {
  constructor(page: Page) {
    super(page, 'Shift Management');
  }
}

export class PayrollPage extends ApplicationModulePage {
  constructor(page: Page) {
    super(page, 'Payroll');
  }
}

export class RecruitmentPage extends ApplicationModulePage {
  constructor(page: Page) {
    super(page, 'Recruitment');
  }
}

export class PerformancePage extends ApplicationModulePage {
  constructor(page: Page) {
    super(page, 'Perform');
  }
}

export class ReportsPage extends ApplicationModulePage {
  constructor(page: Page) {
    super(page, 'Reports');
  }
}

export class SettingsPage extends ApplicationModulePage {
  constructor(page: Page) {
    super(page, 'Settings');
  }
}

export class RolesAndPermissionsPage extends ApplicationModulePage {
  constructor(page: Page) {
    super(page, 'Roles and Permissions');
  }
}
