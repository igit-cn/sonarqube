/*
 * SonarQube
 * Copyright (C) 2009-2018 SonarSource SA
 * mailto:info AT sonarsource DOT com
 *
 * This program is free software; you can redistribute it and/or
 * modify it under the terms of the GNU Lesser General Public
 * License as published by the Free Software Foundation; either
 * version 3 of the License, or (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the GNU
 * Lesser General Public License for more details.
 *
 * You should have received a copy of the GNU Lesser General Public License
 * along with this program; if not, write to the Free Software Foundation,
 * Inc., 51 Franklin Street, Fifth Floor, Boston, MA  02110-1301, USA.
 */
import { getJSON, postJSON, post } from '../helpers/request';
import throwGlobalError from '../app/utils/throwGlobalError';

export function bindAlmOrganization(data: { installationId: string; organization: string }) {
  return post('/api/alm_integration/bind_organization', data).catch(throwGlobalError);
}

export function getAlmAppInfo(): Promise<{ application: T.AlmApplication }> {
  return getJSON('/api/alm_integration/show_app_info').catch(throwGlobalError);
}

function fetchAlmOrganization(data: { installationId: string }, remainingTries: number) {
  return getJSON('/api/alm_integration/show_organization', data).catch(
    (error: { response: Response }) => {
      remainingTries--;
      if (error.response.status === 404) {
        if (remainingTries > 0) {
          return new Promise(resolve => {
            setTimeout(() => resolve(fetchAlmOrganization(data, remainingTries)), 500);
          });
        }
        return Promise.reject();
      }
      return throwGlobalError(error);
    }
  );
}

export interface GetAlmOrganizationResponse {
  almOrganization: T.AlmOrganization;
  boundOrganization?: T.OrganizationBase;
}

export function getAlmOrganization(data: {
  installationId: string;
}): Promise<GetAlmOrganizationResponse> {
  return fetchAlmOrganization(data, 5).then(({ almOrganization, boundOrganization }) => ({
    almOrganization: {
      ...almOrganization,
      name: almOrganization.name || almOrganization.key
    },
    boundOrganization
  }));
}

export function getRepositories(data: {
  organization: string;
}): Promise<{ repositories: T.AlmRepository[] }> {
  return getJSON('/api/alm_integration/list_repositories', data).catch(throwGlobalError);
}

export function listUnboundApplications(): Promise<T.AlmUnboundApplication[]> {
  return getJSON('/api/alm_integration/list_unbound_applications').then(
    ({ applications }) =>
      applications.map((app: T.AlmUnboundApplication) => ({ ...app, name: app.name || app.key })),
    throwGlobalError
  );
}

export function provisionProject(data: {
  installationKeys: string[];
  organization: string;
}): Promise<{ projects: Array<{ projectKey: string }> }> {
  return postJSON('/api/alm_integration/provision_projects', {
    ...data,
    installationKeys: data.installationKeys.join(',')
  }).catch(throwGlobalError);
}
