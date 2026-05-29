from django.contrib.auth.models import AbstractBaseUser, BaseUserManager, PermissionsMixin
from django.db import models
from django.utils import timezone


class UserManager(BaseUserManager):
    def create_user(self, email, password=None, **extra_fields):
        if not email:
            raise ValueError('Email field is required')
        email = self.normalize_email(email)
        user = self.model(email=email, **extra_fields)
        user.set_password(password)
        user.save(using=self._db)
        return user

    def create_superuser(self, email, password=None, **extra_fields):
        # Superusers are always staff, superuser, and auto-approved
        extra_fields.setdefault('is_staff', True)
        extra_fields.setdefault('is_superuser', True)
        extra_fields.setdefault('role', 'admin')
        extra_fields.setdefault('is_approved', True)  # auto-approve superusers
        return self.create_user(email, password, **extra_fields)


class User(AbstractBaseUser, PermissionsMixin):
    ROLE_CHOICES = (
        ('admin', 'Admin'),
        ('driver', 'Driver'),
        ('student', 'Student'),
    )

    email = models.EmailField(unique=True)
    full_name = models.CharField(max_length=255)
    phone = models.CharField(max_length=20, blank=True, null=True)
    role = models.CharField(max_length=10, choices=ROLE_CHOICES, default='student')

    is_active = models.BooleanField(default=True)
    is_staff = models.BooleanField(default=False)
    date_joined = models.DateTimeField(default=timezone.now)

    # ── Approval Gate ──────────────────────────────────────────────────────────
    # New users start as "pending" (is_approved=False).
    # They cannot login until an admin sets is_approved=True.
    # Admins/superusers are auto-approved on creation.
    is_approved = models.BooleanField(
        default=False,
        help_text='Has this account been approved by an admin? Users cannot login until approved.'
    )

    # Tracks who approved this user and when
    approved_by = models.ForeignKey(
        'self',
        null=True, blank=True,
        on_delete=models.SET_NULL,
        related_name='approved_users',
        help_text='Admin who approved this user'
    )
    approved_at = models.DateTimeField(null=True, blank=True)

    # Optional profile picture
    profile_picture = models.ImageField(
        upload_to='profiles/',
        null=True, blank=True,
        help_text='User profile picture'
    )

    # Optional rejection reason
    rejection_reason = models.TextField(
        blank=True, null=True,
        help_text='Reason for rejection (optional)'
    )

    objects = UserManager()

    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = ['full_name']

    def __str__(self):
        return f"{self.email} ({self.role})"

    def approve(self, admin_user):
        """Approve this user account. Called by an admin."""
        self.is_approved = True
        self.is_active = True
        self.approved_by = admin_user
        self.approved_at = timezone.now()
        self.rejection_reason = None
        self.save(update_fields=['is_approved', 'is_active', 'approved_by', 'approved_at', 'rejection_reason'])

    def reject(self, reason=''):
        """Reject this user account. Called by an admin."""
        self.is_approved = False
        self.is_active = False  # block login
        self.rejection_reason = reason
        self.save(update_fields=['is_approved', 'is_active', 'rejection_reason'])


class DriverProfile(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='driver_profile')
    license_number = models.CharField(max_length=50, blank=True, null=True)
    license_expiry = models.DateField(blank=True, null=True)
    is_verified = models.BooleanField(default=False)

    def __str__(self):
        return f"Driver: {self.user.full_name}"
