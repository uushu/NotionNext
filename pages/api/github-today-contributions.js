const GITHUB_OWNER = 'uushu'
const GITHUB_REPOSITORY = 'NotionNext'
const CONTRIBUTION_TIME_ZONE = 'Asia/Shanghai'

const formatDayKey = value => {
  const date = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(date.getTime())) return ''

  return new Intl.DateTimeFormat('en-CA', {
    timeZone: CONTRIBUTION_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).format(date)
}

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET')
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const requestedDate =
    typeof req.query.date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(req.query.date)
      ? req.query.date
      : formatDayKey(new Date())

  try {
    const endpoint = new URL(
      `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPOSITORY}/commits`
    )
    endpoint.searchParams.set('author', GITHUB_OWNER)
    endpoint.searchParams.set('per_page', '100')

    const response = await fetch(endpoint, {
      headers: {
        Accept: 'application/vnd.github+json',
        'User-Agent': 'NotionNext-Homepage-Heatmap',
        'X-GitHub-Api-Version': '2022-11-28'
      }
    })

    if (!response.ok) {
      throw new Error(`GitHub API returned ${response.status}`)
    }

    const commits = await response.json()
    const count = Array.isArray(commits)
      ? commits.filter(commit => {
          const timestamp =
            commit?.commit?.author?.date || commit?.commit?.committer?.date
          return formatDayKey(timestamp) === requestedDate
        }).length
      : 0

    res.setHeader(
      'Cache-Control',
      'public, s-maxage=300, stale-while-revalidate=900'
    )

    return res.status(200).json({
      date: requestedDate,
      count,
      repository: `${GITHUB_OWNER}/${GITHUB_REPOSITORY}`
    })
  } catch (error) {
    console.error('[GitHubTodayContributions]', error)
    return res.status(502).json({
      date: requestedDate,
      count: 0,
      error: 'Unable to load GitHub contributions'
    })
  }
}
