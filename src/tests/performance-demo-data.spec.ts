import { APIRequestContext, APIResponse, Page, Response } from '@playwright/test';
import { expect, test } from '../fixtures/auth.fixture';

const apiPrefix = '/shift/api/v1/pmp';
const primaryFrameworkName = 'Demo Framework 01 - Engineering Excellence';
const competencyGroupName = 'Demo Competency - Engineering Excellence';
const recommendationTypeName = 'Demo Recommendation - Growth Coaching';
const demoCycleName = 'Demo Performance Cycle - Engineering Excellence';
const demoFrameworkNames = [
  primaryFrameworkName,
  'Demo Framework 02 - Delivery Excellence',
  ...Array.from(
    { length: 48 },
    (_, index) => `Demo Framework ${String(index + 3).padStart(2, '0')} - Performance Showcase`,
  ),
];

type NamedRecord = { id: string; name: string };
type FrameworkSummary = NamedRecord & {
  pillarCount: number;
  totalPointBudget: number;
  needsAttention: boolean;
};
type FrameworkDetail = NamedRecord & {
  pillars: Array<{
    id: string;
    name: string;
    pointBudget: number;
    kpis: Array<{ id: string; name: string; points: number; enabled: boolean }>;
  }>;
};
type CreationAvailability = {
  allowed: boolean;
  blockingCycleLabel?: string;
  blockingCycleStatus?: string;
  blockingConfigurationId?: string;
  blockingConfigurationStatus?: string;
};

function uniqueNamed<T extends NamedRecord>(records: T[], name: string): T | undefined {
  const matches = records.filter((record) => record.name === name);
  if (matches.length > 1) {
    throw new Error(`Ambiguous demo data: found ${matches.length} records named "${name}".`);
  }
  return matches[0];
}

function assertEmployeeAvailable(records: Array<{ employeeId: string }>, employeeId: string): void {
  const matches = records.filter((record) => record.employeeId === employeeId);
  if (matches.length > 1) {
    throw new Error(`Ambiguous employee assignment: employee ${employeeId} appears ${matches.length} times.`);
  }
}

async function responseData<T>(response: APIResponse | Response, operation: string): Promise<T> {
  if (!response.ok()) {
    const body = (await response.text()).slice(0, 500);
    throw new Error(`${operation} failed with HTTP ${response.status()}: ${body}`);
  }
  const payload = (await response.json()) as { data?: T } | T;
  return typeof payload === 'object' && payload !== null && 'data' in payload
    ? (payload as { data: T }).data
    : (payload as T);
}

async function apiCall<T>(
  request: APIRequestContext,
  baseUrl: string,
  headers: Record<string, string>,
  method: 'get' | 'post',
  path: string,
  operation: string,
  data?: unknown,
): Promise<T> {
  const response = await request[method](`${baseUrl}${apiPrefix}${path}`, {
    headers,
    data,
  });
  return responseData<T>(response, operation);
}

async function capturePmpSession(page: Page): Promise<{
  baseUrl: string;
  headers: Record<string, string>;
  frameworks: FrameworkSummary[];
}> {
  const responsePromise = page.waitForResponse(
    (response) =>
      response.url().endsWith(`${apiPrefix}/custom-frameworks`) &&
      response.request().method() === 'GET' &&
      response.status() === 200,
  );
  await page.goto('/pms/hr-admin');
  const response = await responsePromise;
  const headers = await response.request().allHeaders();
  delete headers['content-length'];
  return {
    baseUrl: new URL(response.url()).origin,
    headers,
    frameworks: await responseData<FrameworkSummary[]>(response, 'Load custom frameworks'),
  };
}

async function configuredEmployeeId(page: Page): Promise<string> {
  const responsePromise = page.waitForResponse((response) =>
    response.url().includes('/api/Employee/GetEmployeePersonalDetails?empId='),
  );
  await page.reload();
  const response = await responsePromise;
  const employeeId = new URL(response.url()).searchParams.get('empId');
  if (!employeeId) {
    throw new Error('The configured employee account did not expose an employee ID.');
  }
  return employeeId;
}

test.describe('Perform demo-data safeguards', () => {
  test('detects existing, missing, and ambiguous deterministic records', () => {
    expect(uniqueNamed([{ id: '1', name: primaryFrameworkName }], primaryFrameworkName)?.id).toBe('1');
    expect(uniqueNamed([], primaryFrameworkName)).toBeUndefined();
    expect(() =>
      uniqueNamed(
        [
          { id: '1', name: primaryFrameworkName },
          { id: '2', name: primaryFrameworkName },
        ],
        primaryFrameworkName,
      ),
    ).toThrow('Ambiguous demo data');
  });

  test('rejects duplicate employee assignments without substituting another employee', () => {
    expect(() =>
      assertEmployeeAvailable([{ employeeId: '7' }, { employeeId: '7' }], '7'),
    ).toThrow('Ambiguous employee assignment');
    expect(() => assertEmployeeAvailable([], '7')).not.toThrow();
  });
});

test.describe('Perform demo data @performance-demo-data @mutating', () => {
  test('creates or reuses the connected beta demo dataset', async ({ loginAs }) => {
    test.setTimeout(600_000);
    if ((process.env.TEST_ENV ?? 'beta') !== 'beta') {
      throw new Error('Performance demo data may only run with TEST_ENV=beta.');
    }

    const adminSession = await loginAs('admin');
    const employeeSession = await loginAs('employee');
    const employeeId = await configuredEmployeeId(employeeSession.page);
    const { page } = adminSession;
    const session = await capturePmpSession(page);

    let frameworks = session.frameworks;
    for (const name of demoFrameworkNames) {
      if (!uniqueNamed(frameworks, name)) {
        const created = await apiCall<FrameworkSummary>(
          page.request,
          session.baseUrl,
          session.headers,
          'post',
          '/custom-frameworks',
          `Create framework "${name}"`,
          { name },
        );
        frameworks.push(created);
      }
    }

    frameworks = await apiCall<FrameworkSummary[]>(
      page.request,
      session.baseUrl,
      session.headers,
      'get',
      '/custom-frameworks',
      'Reload custom frameworks',
    );
    for (const name of demoFrameworkNames) {
      expect(uniqueNamed(frameworks, name), `Framework "${name}" should exist once`).toBeDefined();
    }
    expect(frameworks.filter(({ name }) => name.startsWith('Demo Framework ')).length).toBeGreaterThanOrEqual(50);

    const primarySummary = uniqueNamed(frameworks, primaryFrameworkName);
    if (!primarySummary) {
      throw new Error(`Primary framework "${primaryFrameworkName}" was not created.`);
    }
    let primary = await apiCall<FrameworkDetail>(
      page.request,
      session.baseUrl,
      session.headers,
      'get',
      `/custom-frameworks/${primarySummary.id}`,
      'Load primary framework',
    );
    if (primary.pillars.reduce((total, pillar) => total + pillar.pointBudget, 0) === 200) {
      const pillar = await apiCall<{ id: string }>(
        page.request,
        session.baseUrl,
        session.headers,
        'post',
        `/custom-frameworks/${primary.id}/pillars`,
        'Create the primary Role Excellence pillar',
        { name: 'Role Excellence', pointBudget: 800 },
      );
      await apiCall(
        page.request,
        session.baseUrl,
        session.headers,
        'post',
        `/custom-frameworks/${primary.id}/pillars/${pillar.id}/kpis`,
        'Create the primary demo KPI',
        {
          name: 'Delivery quality and impact',
          target: 'Achieve 90% of agreed quarterly outcomes',
          points: 800,
          type: 'QUALITATIVE',
          acceptanceRequired: true,
          goalScope: 'CONTINUOUS',
        },
      );
      primary = await apiCall<FrameworkDetail>(
        page.request,
        session.baseUrl,
        session.headers,
        'get',
        `/custom-frameworks/${primary.id}`,
        'Reload primary framework',
      );
    }
    expect(primary.pillars.reduce((total, pillar) => total + pillar.pointBudget, 0)).toBe(1000);
    expect(primary.pillars.flatMap((pillar) => pillar.kpis).some((kpi) => kpi.enabled)).toBe(true);

    const competencyGroups = await apiCall<NamedRecord[]>(
      page.request,
      session.baseUrl,
      session.headers,
      'get',
      '/competency-groups',
      'Load competency groups',
    );
    if (!uniqueNamed(competencyGroups, competencyGroupName)) {
      await apiCall(
        page.request,
        session.baseUrl,
        session.headers,
        'post',
        '/competency-groups',
        'Create demo competency group',
        {
          name: competencyGroupName,
          description: 'Demo competencies for the Engineering Excellence framework.',
        },
      );
    }

    const recommendationTypes = await apiCall<NamedRecord[]>(
      page.request,
      session.baseUrl,
      session.headers,
      'get',
      '/recommendation-types?activeOnly=false',
      'Load recommendation types',
    );
    if (!uniqueNamed(recommendationTypes, recommendationTypeName)) {
      await apiCall(
        page.request,
        session.baseUrl,
        session.headers,
        'post',
        '/recommendation-types',
        'Create demo recommendation type',
        {
          name: recommendationTypeName,
          description: 'Demo growth recommendation for the Perform showcase.',
          active: true,
        },
      );
    }

    const availability = await apiCall<CreationAvailability>(
      page.request,
      session.baseUrl,
      session.headers,
      'get',
      '/organization-framework-configurations/creation-availability',
      'Check performance-cycle creation availability',
    );
    let configurationId: string;
    if (availability.allowed) {
      const created = await apiCall<{ id: string }>(
        page.request,
        session.baseUrl,
        session.headers,
        'post',
        '/organization-framework-configurations',
        'Create demo performance cycle',
        {
          standardFrameworkId: primary.id,
          academicYearLabel: demoCycleName,
          startDate: '2026-10-01',
          endDate: '2027-09-30',
          reviewFrequency: 'QUARTERLY',
          finalRatingMode: 'AGGREGATE',
        },
      );
      configurationId = created.id;
    } else if (
      availability.blockingCycleLabel === demoCycleName &&
      availability.blockingConfigurationId &&
      availability.blockingConfigurationStatus !== 'LOCKED'
    ) {
      configurationId = availability.blockingConfigurationId;
    } else {
      throw new Error(
        `Cycle mutation stopped: existing cycle "${availability.blockingCycleLabel ?? 'unknown'}" ` +
          `is ${availability.blockingCycleStatus ?? 'unknown'} and its configuration is ` +
          `${availability.blockingConfigurationStatus ?? 'unknown'}. The workflow will not alter, lock, ` +
          'or replace that cycle; make a separate demo cycle available and rerun.',
      );
    }

    const rosterPath = `/organization-framework-configurations/${configurationId}/employee-assignments`;
    let roster = await apiCall<{ entries: Array<{ employeeId: string; employeeName: string }> }>(
      page.request,
      session.baseUrl,
      session.headers,
      'get',
      rosterPath,
      'Load demo cycle roster',
    );
    assertEmployeeAvailable(roster.entries, employeeId);
    if (!roster.entries.some((entry) => entry.employeeId === employeeId)) {
      await apiCall(
        page.request,
        session.baseUrl,
        session.headers,
        'post',
        `${rosterPath}/${employeeId}`,
        `Assign configured employee ${employeeId}`,
      );
      roster = await apiCall(
        page.request,
        session.baseUrl,
        session.headers,
        'get',
        rosterPath,
        'Reload demo cycle roster',
      );
    }
    expect(roster.entries.filter((entry) => entry.employeeId === employeeId)).toHaveLength(1);
    const frameworksInCycle = await apiCall<{ frameworksInCycle: Array<{ frameworkId: string }> }>(
      page.request,
      session.baseUrl,
      session.headers,
      'get',
      `/organization-framework-configurations/${configurationId}/frameworks-in-cycle`,
      'Load frameworks in the demo cycle',
    );
    expect(frameworksInCycle.frameworksInCycle.some(({ frameworkId }) => frameworkId === primary.id)).toBe(true);
    await apiCall(
      page.request,
      session.baseUrl,
      session.headers,
      'post',
      '/cycle-bulk-seed/apply-templates',
      `Seed or reuse KPI goals for configured employee ${employeeId}`,
      {
        performanceCycleId: configurationId,
        employeeIds: [employeeId],
        seedFromFrameworkId: primary.id,
      },
    );

    const adminScreens = [
      ['/pms/hr-admin', 'Framework Library'],
      ['/pms/hr-admin/performance-cycle', 'Performance Cycles'],
      ['/pms/manager/team-report', 'Team Overview'],
      ['/pms/hr-admin/team-goals', 'Goals'],
      ['/pms/hr-admin/reports/org-wide', 'Org-Wide Report'],
      ['/pms/hr-admin/reports/goals', 'Goal/KPI Report'],
      ['/pms/hr-admin/reports/bell-curve', 'Bell Curve Analysis'],
    ] as const;
    for (const [route, heading] of adminScreens) {
      await page.goto(route);
      await expect(page.getByRole('heading', { name: heading, exact: true })).toBeVisible();
    }
    await page.goto('/pms/hr-admin');
    await expect(page.getByText(primaryFrameworkName, { exact: true })).toBeVisible();
    await page.goto('/pms/hr-admin/reports/goals');
    await expect(page.getByText('No goals yet', { exact: true })).toHaveCount(0);

    for (const [route, heading] of [
      ['/pms/employee', 'Overview'],
      ['/pms/employee/performance', 'My Performance'],
    ] as const) {
      await employeeSession.page.goto(route);
      await expect(employeeSession.page.getByRole('heading', { name: heading, exact: true })).toBeVisible();
      await expect(employeeSession.page.getByText('No goals assigned yet', { exact: true })).toHaveCount(0);
    }
  });
});
