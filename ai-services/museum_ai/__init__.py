"""Smart Museum Guide AI service: translate exhibit copy and narrate it.

The backend API hands jobs to this service; each task is translated from the
primary copy, narrated, and reported back through a signed webhook.
"""

__version__ = "1.0.0"
