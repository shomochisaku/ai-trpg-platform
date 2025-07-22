import React from 'react';

interface ErrorPageProps {
  type: '404' | '500';
  title?: string;
  message?: string;
}

const ErrorPage: React.FC<ErrorPageProps> = ({ type, title, message }) => {

  const defaultTitles = {
    '404': 'ページが見つかりません',
    '500': 'サーバーエラー'
  };

  const defaultMessages = {
    '404': 'お探しのページは存在しないか、移動された可能性があります。',
    '500': 'サーバーで問題が発生しました。しばらくしてからもう一度お試しください。'
  };

  const handleGoHome = () => {
    window.location.href = '/';
  };

  const handleGoBack = () => {
    window.history.back();
  };

  const handleReload = () => {
    window.location.reload();
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center px-4">
      <div className="text-center max-w-lg mx-auto">
        {/* Error Code */}
        <div className="mb-8">
          <h1 className="text-6xl font-bold text-blue-400 mb-4">{type}</h1>
          <h2 className="text-2xl font-semibold text-gray-200 mb-2">
            {title || defaultTitles[type]}
          </h2>
          <p className="text-gray-400 text-lg leading-relaxed">
            {message || defaultMessages[type]}
          </p>
        </div>

        {/* Illustration */}
        <div className="mb-8">
          <div className="w-32 h-32 mx-auto bg-gradient-to-br from-blue-400 to-purple-500 rounded-full opacity-20 flex items-center justify-center">
            {type === '404' ? (
              <svg className="w-16 h-16" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
            ) : (
              <svg className="w-16 h-16" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button
              onClick={handleGoHome}
              className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors duration-200"
            >
              ホームに戻る
            </button>
            <button
              onClick={handleGoBack}
              className="px-6 py-3 bg-gray-600 hover:bg-gray-700 text-white font-medium rounded-lg transition-colors duration-200"
            >
              前のページに戻る
            </button>
          </div>
          
          {type === '500' && (
            <button
              onClick={handleReload}
              className="px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white font-medium rounded-lg transition-colors duration-200"
            >
              ページを再読み込み
            </button>
          )}
        </div>

        {/* Additional Help */}
        <div className="mt-12 text-sm text-gray-500">
          <p>問題が解決しない場合は、お問い合わせください。</p>
        </div>
      </div>
    </div>
  );
};

// Specific error page components
export const NotFoundPage: React.FC = () => (
  <ErrorPage type="404" />
);

export const ServerErrorPage: React.FC = () => (
  <ErrorPage type="500" />
);

export default ErrorPage;