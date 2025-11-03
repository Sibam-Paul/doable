import { NextResponse } from 'next/server'

const GITHUB_API_URL = 'https://api.github.com'
const REPO_OWNER = 'KartikLabhshetwar'
const REPO_NAME = 'doable'

export async function GET() {
  try {
    // Fetch contributors from GitHub API
    const response = await fetch(
      `${GITHUB_API_URL}/repos/${REPO_OWNER}/${REPO_NAME}/contributors`,
      {
        headers: {
          'Accept': 'application/vnd.github.v3+json',
          // Optional: Add your GitHub token here if you need higher rate limits
          // 'Authorization': `token ${process.env.GITHUB_TOKEN}`,
        },
        // Cache for 1 hour
        next: { revalidate: 3600 },
      }
    )

    if (!response.ok) {
      throw new Error(`GitHub API error: ${response.status}`)
    }

    const contributors = await response.json()

    // Fetch additional user details for each contributor (name, bio, etc.)
    // Limit to top 20 contributors
    const topContributors = contributors.slice(0, 20)
    
    const contributorsWithDetails = await Promise.allSettled(
      topContributors.map(async (contributor: any) => {
        try {
          // Fetch user details if url is available
          if (contributor.url) {
            const userResponse = await fetch(contributor.url, {
              headers: {
                'Accept': 'application/vnd.github.v3+json',
              },
              next: { revalidate: 3600 },
            })

            if (userResponse.ok) {
              const userData = await userResponse.json()
              return {
                login: contributor.login,
                name: userData.name || contributor.login,
                avatar_url: contributor.avatar_url,
                contributions: contributor.contributions,
                html_url: contributor.html_url,
                bio: userData.bio || '',
              }
            }
          }
        } catch (error) {
          console.error(`Error fetching user details for ${contributor.login}:`, error)
        }

        // Fallback if user details fetch fails
        return {
          login: contributor.login,
          name: contributor.login,
          avatar_url: contributor.avatar_url,
          contributions: contributor.contributions,
          html_url: contributor.html_url,
          bio: '',
        }
      })
    )

    // Extract successful results
    const validContributors = contributorsWithDetails
      .filter((result): result is PromiseFulfilledResult<any> => result.status === 'fulfilled')
      .map(result => result.value)

    return NextResponse.json(validContributors)
  } catch (error) {
    console.error('Error fetching contributors:', error)
    return NextResponse.json(
      { error: 'Failed to fetch contributors' },
      { status: 500 }
    )
  }
}

