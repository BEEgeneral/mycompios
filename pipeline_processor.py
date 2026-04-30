#!/usr/bin/env python3
"""
Mission Pipeline Processor
Polsia-style: orchestrator → missions → tasks → agent execution
"""

import requests
import os
from datetime import datetime, timedelta

MYCOMPI_URL = os.getenv('MYCOMPI_URL', 'https://www.mycompi.com')

def process_mission(mission_id):
    """Process a single mission"""
    url = MYCOMPI_URL + '/api/pipeline/process'
    resp = requests.post(url, json={'mission_id': mission_id}, timeout=120)
    return resp.json()

def check_and_run_missions():
    """Check all active missions and run those due"""
    url = MYCOMPI_URL + '/api/pipeline/check'
    resp = requests.get(url, timeout=30)
    return resp.json()

def get_pending_tasks():
    """Get pending tasks for execution"""
    url = MYCOMPI_URL + '/api/pipeline/tasks'
    resp = requests.get(url, timeout=30)
    return resp.json()

def run_task(task_id, agent_type, task_name, company_id=None):
    """Run a specific task via agent"""
    url = MYCOMPI_URL + '/api/execute-tasks'
    resp = requests.post(url, json={
        'task_id': task_id,
        'agent_type': agent_type,
        'task_name': task_name,
        'company_id': company_id
    }, timeout=120)
    return resp.json()

if __name__ == '__main__':
    print(f'[{datetime.utcnow()}] Pipeline processor started')
    
    # Check and run due missions
    result = check_and_run_missions()
    print(f'[{datetime.utcnow()}] Missions check: {result}')
    
    # Process pending tasks
    tasks = get_pending_tasks()
    print(f'[{datetime.utcnow()}] Pending tasks: {len(tasks.get("tasks", []))}')
    
    for task in tasks.get('tasks', []):
        print(f'Running: {task["task_name"]} ({task["agent_id"]})')
        result = run_task(task['id'], task['agent_id'], task['task_name'], task.get('company_id'))
        print(f'Result: {result}')