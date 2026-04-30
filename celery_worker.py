#!/usr/bin/env python3
"""
Celery Worker for MyCompi - Polsia-style task execution
Runs on VPS with Redis broker
"""

import os
import time
import json
import psycopg2
import requests
from datetime import datetime
from celery import Celery
from celery.schedules import crontab

# PostgreSQL connection (Neon)
POSTGRES_HOST = os.getenv('POSTGRES_HOST', 'ep-mute-mud-agxfgf1q-pooler')
POSTGRES_DB = os.getenv('POSTGRES_DB', 'postgres')
POSTGRES_USER = os.getenv('POSTGRES_USER', 'postgres')
POSTGRES_PASSWORD = os.getenv('POSTGRES_PASSWORD', '')
NEON_SSL = os.getenv('NEON_SSL', 'require')

# Redis connection
REDIS_URL = os.getenv('REDIS_URL', 'redis://localhost:6379/0')

# MyCompi URL for API calls
MYCOMPI_URL = os.getenv('MYCOMPI_URL', 'https://www.mycompi.com')

# Celery app
app = Celery('mycompi', broker=REDIS_URL, backend=REDIS_URL)

# Configure
app.conf.update(
    task_serializer='json',
    result_serializer='json',
    accept_content=['json'],
    task_acks_late=True,
    task_reject_on_worker_lost=True,
    worker_prefetch_multiplier=1,
)

# Beat schedule - Polsia-style
app.conf.beat_schedule = {
    # Daily cycles
    'morning-cycle': {
        'task': 'mycompi.morning_cycle',
        'schedule': crontab(hour=6, minute=0),
    },
    'evening-cycle': {
        'task': 'mycompi.evening_cycle',
        'schedule': crontab(hour=20, minute=0),
    },
    # Sweep tasks
    'social-sweep': {
        'task': 'mycompi.social_sweep',
        'schedule': crontab(minute=0, hour='*/2'),
    },
    'email-sweep': {
        'task': 'mycompi.email_sweep',
        'schedule': crontab(minute=0, hour='*/3'),
    },
    'ads-sync': {
        'task': 'mycompi.ads_sync',
        'schedule': crontab(minute=0, hour='*/6'),
    },
}


def get_db_connection():
    """Connect to Neon PostgreSQL"""
    try:
        conn = psycopg2.connect(
            host=POSTGRES_HOST,
            database=POSTGRES_DB,
            user=POSTGRES_USER,
            password=POSTGRES_PASSWORD,
            sslmode=NEON_SSL
        )
        return conn
    except Exception as e:
        print(f'[DB] Connection failed: {e}')
        return None


def call_api(endpoint, company_id=None):
    """Call MyCompi API endpoint"""
    url = MYCOMPI_URL + endpoint
    try:
        if company_id:
            resp = requests.post(url, json={'company_id': company_id}, timeout=120)
        else:
            resp = requests.post(url, timeout=120)
        return resp.json()
    except Exception as e:
        print(f'[API] {endpoint} failed: {e}')
        return {'success': False, 'error': str(e)}


@app.task(name='mycompi.morning_cycle')
def morning_cycle(company_id=None):
    """Morning planning cycle - 06:00 UTC"""
    print(f'[MorningCycle] Starting at {datetime.utcnow()}')
    result = call_api('/api/orchestrator/morning-cycle', company_id)
    print(f'[MorningCycle] Result:', result)
    return result


@app.task(name='mycompi.evening_cycle')
def evening_cycle(company_id=None):
    """Evening summary cycle - 20:00 UTC"""
    print(f'[EveningCycle] Starting at {datetime.utcnow()}')
    result = call_api('/api/orchestrator/evening-cycle', company_id)
    print(f'[EveningCycle] Result:', result)
    return result


@app.task(name='mycompi.social_sweep')
def social_sweep(company_id=None):
    """Social media sweep - every 2 hours"""
    print(f'[SocialSweep] Starting at {datetime.utcnow()}')
    result = call_api('/api/sweeps/social', company_id)
    print(f'[SocialSweep] Result:', result)
    return result


@app.task(name='mycompi.email_sweep')
def email_sweep(company_id=None):
    """Email inbox sweep - every 3 hours"""
    print(f'[EmailSweep] Starting at {datetime.utcnow()}')
    result = call_api('/api/sweeps/email', company_id)
    print(f'[EmailSweep] Result:', result)
    return result


@app.task(name='mycompi.ads_sync')
def ads_sync(company_id=None):
    """Ads/Stripe sync - every 6 hours"""
    print(f'[AdsSync] Starting at {datetime.utcnow()}')
    result = call_api('/api/sweeps/ads', company_id)
    print(f'[AdsSync] Result:', result)
    return result


@app.task(name='mycompi.execute_task')
def execute_task(task_id, agent_type, task_name, company_id=None):
    """Execute a specific task via agent"""
    print(f'[ExecuteTask] {agent_type} - {task_name}')
    
    conn = get_db_connection()
    if not conn:
        return {'status': 'failed', 'error': 'DB connection failed'}
    
    try:
        cur = conn.cursor()
        
        # Update task status
        cur.execute(
            'UPDATE mission_tasks SET status=%s, executed_at=NOW() WHERE id=%s',
            ('running', task_id)
        )
        conn.commit()
        
        # Call task execution API
        result = call_api('/api/execute-tasks', company_id)
        
        # Mark as completed
        cur.execute(
            'UPDATE mission_tasks SET status=%s, completed_at=NOW(), result=%s WHERE id=%s',
            ('completed', json.dumps(result), task_id)
        )
        conn.commit()
        
        return {'status': 'completed', 'result': result}
        
    except Exception as e:
        conn.rollback()
        print(f'[ExecuteTask] Error: {e}')
        return {'status': 'failed', 'error': str(e)}
    finally:
        cur.close()
        conn.close()


if __name__ == '__main__':
    # Start worker: celery -A celery_worker worker --loglevel=info -c 4
    app.start()