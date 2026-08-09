from contextvars import ContextVar
request_user_agent_ctx: ContextVar[str] = ContextVar("request_user_agent", default=None)
