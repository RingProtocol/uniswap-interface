import { Module } from '@orbs-network/spot-react'
import { useCallback, useEffect, useMemo } from 'react'
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom'

import { PATHNAME_BY_MODULE } from 'pages/Advanced/spot/constants'
import { getModuleFromPathname, getModuleFromSearchParam } from 'pages/Advanced/spot/utils'

export function useSpotRouteModule() {
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const [searchParams] = useSearchParams()
  const legacyModuleParam = searchParams.get('module')
  const selectedModule = useMemo(() => getModuleFromPathname(pathname), [pathname])

  useEffect(() => {
    if (!legacyModuleParam) {
      return
    }

    const legacyModule = getModuleFromSearchParam(legacyModuleParam)
    const nextSearchParams = new URLSearchParams(searchParams)
    nextSearchParams.delete('module')
    const nextSearch = nextSearchParams.toString()

    navigate(
      {
        pathname: PATHNAME_BY_MODULE[legacyModule],
        search: nextSearch ? `?${nextSearch}` : '',
      },
      { replace: true },
    )
  }, [legacyModuleParam, navigate, searchParams])

  const onSelectModule = useCallback(
    (module: Module) => {
      const nextSearchParams = new URLSearchParams(searchParams)
      nextSearchParams.delete('module')
      const nextSearch = nextSearchParams.toString()
      navigate(
        {
          pathname: PATHNAME_BY_MODULE[module],
          search: nextSearch ? `?${nextSearch}` : '',
        },
        { replace: true },
      )
    },
    [navigate, searchParams],
  )

  return { selectedModule, onSelectModule }
}
