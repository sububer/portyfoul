import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { config } from '@/lib/config';

interface HealthCheck {
  status: 'healthy' | 'unhealthy';
  checks: {
    database: 'healthy' | 'unhealthy';
    configuration: 'healthy' | 'unhealthy';
  };
  timestamp: string;
  error?: string;
}

/**
 * Health check endpoint for ECS ALB target group monitoring
 *
 * Performs lightweight checks on critical dependencies:
 * - Database connectivity (PostgreSQL)
 * - Required configuration (environment variables)
 *
 * Returns:
 * - 200 OK: All checks pass
 * - 503 Service Unavailable: Any check fails
 */
export async function GET(request: NextRequest): Promise<NextResponse<HealthCheck>> {
  const checks = {
    database: 'unhealthy' as 'healthy' | 'unhealthy',
    configuration: 'unhealthy' as 'healthy' | 'unhealthy',
  };

  let overallStatus: 'healthy' | 'unhealthy' = 'healthy';
  let errorMessage: string | undefined;

  try {
    // Check 1: Database connectivity
    // Use a simple SELECT 1 query to verify the database is reachable
    // This reuses existing connection pool connections for efficiency
    try {
      await query('SELECT 1');
      checks.database = 'healthy';
    } catch (dbError) {
      checks.database = 'unhealthy';
      overallStatus = 'unhealthy';
      errorMessage = 'Database connection failed';
      console.error('Health check: Database connectivity failed', dbError);
    }

    // Check 2: Configuration validation
    // Verify critical environment variables are present
    // Note: We don't validate values, just presence
    try {
      const requiredVars = [
        config.database.host,
        config.database.port,
        config.database.database,
        config.database.user,
        config.database.password,
        config.auth.jwtSecret,
        config.finnhub.apiKey,
      ];

      const allPresent = requiredVars.every(v => v !== undefined && v !== '');

      if (allPresent) {
        checks.configuration = 'healthy';
      } else {
        checks.configuration = 'unhealthy';
        overallStatus = 'unhealthy';
        errorMessage = errorMessage || 'Required configuration missing';
        console.error('Health check: Configuration validation failed');
      }
    } catch (configError) {
      checks.configuration = 'unhealthy';
      overallStatus = 'unhealthy';
      errorMessage = errorMessage || 'Configuration validation error';
      console.error('Health check: Configuration validation error', configError);
    }

    const response: HealthCheck = {
      status: overallStatus,
      checks,
      timestamp: new Date().toISOString(),
    };

    if (errorMessage) {
      response.error = errorMessage;
    }

    // Return appropriate status code
    const statusCode = overallStatus === 'healthy' ? 200 : 503;

    return NextResponse.json(response, { status: statusCode });

  } catch (error) {
    // Catch-all for unexpected errors
    console.error('Health check: Unexpected error', error);

    return NextResponse.json(
      {
        status: 'unhealthy',
        checks,
        timestamp: new Date().toISOString(),
        error: 'Health check failed',
      },
      { status: 503 }
    );
  }
}
