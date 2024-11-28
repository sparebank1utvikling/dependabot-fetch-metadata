import * as core from '@actions/core'
import { Context } from '@actions/github/lib/context'
import { GitHub } from '@actions/github/lib/utils'

export function parseNwo (nwo: string): { owner: string; repo: string } {
  const [owner, name] = nwo.split('/')

  if (!owner || !name) {
    throw new Error(`'${nwo}' does not appear to be a valid repository NWO`)
  }

  return { owner, repo: name }
}

export interface branchNames {
  headName: string,
  baseName: string
}

interface ref {
  ref: string
  sha: string
  repo: {
    id: number
    name: string
    url: string
  }
}

interface prInfo {
  number: number
  base: ref
  head: ref
  id: number
  url: string
  body?: string
  user?: {
    login: string
  }
}

export function getBranchNames (context: Context): branchNames {
  const { pull_request: pr } = context.payload
  return { headName: pr?.head.ref || '', baseName: pr?.base.ref }
}

export async function getBody (context: Context, client: InstanceType<typeof GitHub>): Promise<string> {
  const pr = getPR(context)
  if (!pr) {
    throw new Error('No PR found in context')
  }
  if (!pr.body) {
    client.rest.pulls.get({
      owner: context.repo.owner,
      repo: context.repo.repo,
      pull_number: pr.number
    }).then(({ data }) => {
      return data.body
    })
  }
  return pr.body || ''
}

export function getPR (context: Context): prInfo | undefined {
  const pr = context.payload.pull_request as prInfo | undefined

  // dump context.payload
  core.info(JSON.stringify(context.payload, null, 2))

  // if check_suite, pull_requests is an array
  if (context.eventName === 'check_suite' && context.payload.check_suite.pull_requests && context.payload.check_suite.pull_requests.length > 0) {
    return context.payload.check_suite.pull_requests[0] as prInfo
  }

  if (context.eventName === 'workflow_run' && context.payload.workflow_run.pull_requests && context.payload.workflow_run.pull_requests.length > 0) {
    return context.payload.workflow_run.pull_requests[0] as prInfo
  }

  return pr
}
