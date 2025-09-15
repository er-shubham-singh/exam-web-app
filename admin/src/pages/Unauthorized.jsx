import React from "react";
import { Link } from "react-router-dom";

export default function Unauthorized() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-900 text-gray-100">
      <div className="max-w-md p-8 bg-gray-800 rounded-lg text-center">
        <h2 className="text-2xl font-bold mb-4">Access Denied</h2>
        <p className="text-gray-300 mb-6">
          You do not have permission to view this page.
        </p>
        <Link
          to="/"
          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 rounded"
        >
          Back to Dashboard
        </Link>
      </div>
    </div>
  );
}
