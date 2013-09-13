<?php

namespace Hexmedia\AdministratorBundle\Repository\Doctrine;

use Doctrine\DBAL\Query\QueryBuilder;

trait ListTrait {
    /**
     * @param $alias
     * @return \Doctrine\ORM\QueryBuilder
     */
    public abstract function createQueryBuilder($alias);

    public function getPage($page = 1, $sort = 'id', $pageSize = 10, $sortDirection = 'ASC', $fields = array())
    {
        $queryBuilder = $this->createQueryBuilder('tab')
            ->setMaxResults($pageSize)
            ->setFirstResult(max(0, $page - 1) * $pageSize)
            ->orderBy('tab.' . $sort, $sortDirection == 'ASC' ? 'ASC' : 'DESC');

        return $queryBuilder->getQuery()->getResult();
    }

    public function getCount()
    {
        $queryBuilder = $this->createQueryBuilder("tab")
            ->select("count(tab.id)");

        return $queryBuilder->getQuery()->getSingleScalarResult();

    }
}