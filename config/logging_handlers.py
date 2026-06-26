import logging
import os
from django.utils.timezone import now

class MongoHandler(logging.Handler):
    """
    Resilient logging handler to send errors/critical logs to MongoDB.
    Uses lazy connection and graceful fallbacks to avoid breaking Django.
    """
    def __init__(self, **kwargs):
        super().__init__()
        self.client = None
        self.db = None
        self.collection = None

    def _connect(self):
        if self.client is not None:
            return True
        try:
            from pymongo import MongoClient
            import environ
            env = environ.Env()
            
            # Read MONGO_URL from environment variables, fallback to local instance
            mongo_url = env('MONGO_URL', default='mongodb://localhost:27017/ecommerce_logs')
            
            # Establish connection with 2-second timeout to prevent blocking Django thread
            self.client = MongoClient(mongo_url, serverSelectionTimeoutMS=2000)
            
            # Resolve db_name from connection string, default to 'ecommerce_logs'
            # mongodb://[username:password@]host1[:port1][,...hostN[:portN]][/[defaultdb][?options]]
            db_name = 'ecommerce_logs'
            if '/' in mongo_url.replace('mongodb://', ''):
                path = mongo_url.split('/')[-1]
                if '?' in path:
                    path = path.split('?')[0]
                if path:
                    db_name = path
                    
            self.db = self.client[db_name]
            self.collection = self.db['error_logs']
            
            # Test connection
            self.client.server_info()
            return True
        except Exception:
            # Keep client as None to retry on next log or fail silently without crashing
            self.client = None
            return False

    def emit(self, record):
        try:
            # Establish connection lazily
            if not self._connect():
                return
            
            log_entry = {
                'timestamp': now(),
                'level': record.levelname,
                'message': self.format(record),
                'logger_name': record.name,
                'file_path': record.pathname,
                'line_number': record.lineno,
                'func_name': record.funcName,
            }
            if record.exc_info:
                log_entry['exception'] = self.formatException(record.exc_info)
                
            self.collection.insert_one(log_entry)
        except Exception:
            self.handleError(record)
