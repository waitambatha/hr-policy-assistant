from django.core.management.commands.runserver import Command as RunserverCommand
from django.core.management import call_command

class Command(RunserverCommand):
    help = 'Run server with automatic setup'

    def handle(self, *args, **options):
        # Run migrations
        self.stdout.write('📦 Running migrations...')
        call_command('makemigrations', 'assistant', interactive=False, verbosity=0)
        call_command('migrate', interactive=False, verbosity=0)
        
        # Initialize system
        self.stdout.write('🔧 Initializing system...')
        call_command('init_system')
        
        # Start server
        self.stdout.write('\n🌐 Starting server...\n')
        super().handle(*args, **options)
