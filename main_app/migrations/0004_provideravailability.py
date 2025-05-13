# Generated manually

from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('main_app', '0003_alter_service_category'),
    ]

    operations = [
        migrations.CreateModel(
            name='ProviderAvailability',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('day_of_week', models.CharField(max_length=10)),
                ('start_time', models.DateTimeField()),
                ('end_time', models.DateTimeField()),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('provider', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='availabilities', to='main_app.serviceprovider')),
            ],
            options={
                'unique_together': {('provider', 'day_of_week', 'start_time')},
            },
        ),
    ] 