import React from 'react';

export default class CalendarErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null, info: null };
    }

    static getDerivedStateFromError(error) {
        return { hasError: true, error };
    }

    componentDidCatch(error, info) {
        console.error("Calendar Crash:", error, info);
        this.setState({ error, info });
    }

    render() {
        if (this.state.hasError) {
            return (
                <div className="p-5 m-5 bg-red-100 border-2 border-red-500 rounded-xl text-red-900 h-[800px] overflow-auto">
                    <h2 className="text-xl font-bold mb-2">Calendar Crashed!</h2>
                    <p className="font-mono text-xs whitespace-pre-wrap">{this.state.error?.toString()}</p>
                    <pre className="mt-4 font-mono text-[10px] whitespace-pre-wrap">{this.state.info?.componentStack}</pre>
                </div>
            );
        }
        return this.props.children;
    }
}
