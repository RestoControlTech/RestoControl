/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';
import { Button } from './Button';

interface Props {
  children: ReactNode;
  fallbackTitle?: string;
  fallbackMessage?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('[ErrorBoundary] Caught render error:', error, errorInfo);
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  private handleGoHome = () => {
    this.setState({ hasError: false, error: null });
    window.location.href = '/customer';
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div
          id="app-error-boundary-screen"
          className="min-h-screen bg-stone-100 flex items-center justify-center p-4 font-sans"
        >
          <div className="bg-white rounded-3xl p-8 max-w-md w-full text-center shadow-xl border border-stone-200">
            <div className="w-16 h-16 bg-amber-50 text-amber-600 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-amber-100 shadow-sm">
              <AlertTriangle className="w-8 h-8" />
            </div>
            <h2 className="text-lg font-black text-stone-900 tracking-tight mb-2">
              {this.props.fallbackTitle || 'មានបញ្ហាបច្ចេកទេស'}
            </h2>
            <p className="text-xs text-stone-500 mb-6 leading-relaxed">
              {this.props.fallbackMessage ||
                'កម្មវិធីបានជួបប្រទះបញ្ហាមិនរំពឹងទុក។ សូមព្យាយាមផ្ទុកទំព័រឡើងវិញ ឬបើកម៉ឺនុយម្តងទៀត។'}
            </p>
            {this.state.error && (
              <pre className="text-[10px] font-mono bg-stone-50 p-2.5 rounded-xl text-stone-600 text-left overflow-x-auto mb-6 border border-stone-200/70 max-h-32">
                {this.state.error.message || String(this.state.error)}
              </pre>
            )}
            <div className="flex flex-col sm:flex-row gap-2 justify-center">
              <Button
                variant="primary"
                size="sm"
                icon={<RefreshCw className="w-3.5 h-3.5" />}
                onClick={this.handleReset}
              >
                ផ្ទុកឡើងវិញ (Reload)
              </Button>
              <Button
                variant="secondary"
                size="sm"
                icon={<Home className="w-3.5 h-3.5" />}
                onClick={this.handleGoHome}
              >
                ម៉ឺនុយអតិថិជន (Menu)
              </Button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

