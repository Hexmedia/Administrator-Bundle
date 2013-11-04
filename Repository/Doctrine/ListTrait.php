<?php

namespace Hexmedia\AdministratorBundle\Repository\Doctrine;

use Doctrine\DBAL\Query\QueryBuilder;

trait ListTrait {
    /**
     * {@inheritdoc}
     * @return \Doctrine\ORM\QueryBuilder
     */
    public abstract function createQueryBuilder($alias);

    /**
     * @param string $alias
     * @return \Doctrine\ORM\QueryBuilder
     */
    public function createListQueryBuilder($alias) {
        return $this->createQueryBuilder($alias);
    }

    /**
     * @param int $page
     * @param string $sort
     * @param int $pageSize
     * @param string $sortDirection
     * @param array $fields
     * @return array
     */
    public function getPage($page = 1, $sort = 'id', $pageSize = 10, $sortDirection = 'ASC', $fields = array())
    {
        $queryBuilder = $this->createListQueryBuilder('tab')
            ->setMaxResults($pageSize)
            ->setFirstResult(max(0, $page - 1) * $pageSize)
            ->orderBy('tab.' . $sort, $sortDirection == 'ASC' ? 'ASC' : 'DESC');

        return $queryBuilder->getQuery()->getResult();
    }

    /**
     * @return mixed
     */
    public function getCount()
    {
        $queryBuilder = $this->createListQueryBuilder("tab")
            ->select("count(tab.id)");

        return $queryBuilder->getQuery()->getSingleScalarResult();

    }
}